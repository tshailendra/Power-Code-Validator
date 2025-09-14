/**
 * This module provides functions to process and validate Power Apps files against naming standards.
 * It reads Power Apps JSON files, extracts controls and code elements, validates them according to naming conventions,
 * and updates the UI panel with processing status.
 */

import * as vscode from 'vscode';
import { getNamingStandards, saveData } from './storage';
import * as fs from 'fs';
import { Logger } from "./logger";


export async function processFiles(context: any, panel: vscode.WebviewPanel | undefined, files: any, targetFolder: string) {

  // Retrieve naming standards from storage
  const nameStandards = await getNamingStandards(context, false);
  let codeStandards = nameStandards.output.data.flatMap((item: any) => item._children);

  for (let i = 0; i < files.length; i++) {
    const parent = files[i];

    for (let j = 0; j < parent._children.length; j++) {
      const file = parent._children[j];

      // Mark file as "Processing" and update UI
      file.status = "Processing";
      panel?.webview.postMessage({ type: "updateStatus", payload: { index: file.file, status: file.status, screenName: '' } });

      try {
        // Process each file asynchronously and get the screen name
        const screenName: string = await processEachFile(context, file, targetFolder, codeStandards);
        Logger.info('time to process file', new Date().toISOString())
        // Mark success and update UI
        file.status = "Done";
        panel?.webview.postMessage({ type: "updateStatus", payload: { index: file.file, status: file.status, screenName: screenName } });
      } catch (err) {
        // Mark failure and update UI
        file.status = "Failed";
        panel?.webview.postMessage({ type: "updateStatus", payload: { index: file.file, status: file.status, screenName: 'error' } });
      }
    }
  }
}


async function processEachFile(context: any, file: any, targetFolder: string, nameStandards: any): Promise<string> {
  // Read the JSON file content synchronously
  const data: any = JSON.parse(fs.readFileSync(file.fullPath, 'utf8'));
  // Recursively extract controls starting from the root node
  const allNodes = await extractControl(data.TopParent, '');
  // Validate control names according to naming standards
  const validated = await validateNameStandards(allNodes, nameStandards);
  // Save the validated data to the target folder
  await saveData(targetFolder, `${allNodes.name}.json`, validated);
  return allNodes.name;
}


function extractControl(control: any, parent: string) {
  const node: any = {
    name: control.Name || "",
    type: control.Template?.ComponentType ?? control.Type ?? "",
    templateName: control.Template?.ComponentDefinitionInfo?.Name ?? control.Template?.Name ?? "",
    parent: parent,
    _children: [] // initialize children array
  };

  // Add code nodes from filtered Rules (only specific categories and properties)
  if (Array.isArray(control.Rules) && control.Rules.length > 0) {
    const filtered = control.Rules.filter((rule: any) =>
      (rule.Property === "OnStart" || rule.Category === "Formulas" || rule.Category === "Behavior") &&
      (rule.InvariantScript !== 'false' && rule.InvariantScript !== 'Select(Parent)')
    );

    if (filtered.length > 0) {
      node._children.push(
        ...filtered.map((rule: any) => ({
          name: rule.Property,
          type: rule.Category,
          script: rule.InvariantScript
        }))
      );
    }
  }

  // Recursively add child controls
  if (Array.isArray(control.Children) && control.Children.length > 0) {
    node._children.push(
      ...control.Children.map((child: any) => extractControl(child, node.name))
    );
  }

  // Remove _children property if empty to keep structure clean
  if (node._children.length === 0) {
    delete node._children;
  }

  return node;
}


function validateNameStandards(node: any, codeStandards: any): any {
  // Special handling for the root "App" node
  if (node && node.name === "App") {
    if (Array.isArray(node._children)) {
      for (let i = 0; i < node._children.length; i++) {
        const child = node._children[i];

        // Only expand code nodes of types Behavior, Formulas, OnStart
        if (
          child.type === "Behavior" ||
          child.type === "Formulas" ||
          child.name === "OnStart"
        ) {
          const expanded = validateCodeStandards(child, codeStandards);
          if (Array.isArray(expanded) && expanded.length > 0) {
            child._children = expanded;
          }
        }

        // Do not recurse further under App node
      }
    }
    return node;
  }

  if (Array.isArray(node._children)) {
    for (let i = 0; i < node._children.length; i++) {
      const child = node._children[i];

      // Expand and validate code nodes (leaf children, no recursion)
      if (
        child.type === "Behavior" ||
        child.type === "Formulas" ||
        child.name === "OnStart"
      ) {
        const expanded = validateCodeStandards(child, codeStandards);
        if (Array.isArray(expanded) && expanded.length > 0) {
          child._children = expanded;
        }
      }
      // For control nodes, validate naming and recurse deeper
      else if (child.type === "ControlInfo" || child.type?.includes("Component")) {
        let rule = codeStandards.find((ns: any) => ns.ctrl === child.templateName);
        if (child.type?.includes("Component")) {
          // For components, find generic component rule
          rule = codeStandards.find((ns: any) => ns.ctrl.includes("component"));
        }

        const expectedPrefix = rule?.prefix;
        if (expectedPrefix) {
          if (child.control !== "typedDataCard") {
            if (child.name && child.name.startsWith(expectedPrefix)) {
              child.status = true;
              child.remarks = "pass";
            } else {
              child.status = false;
              child.remarks = `Name must start with ${expectedPrefix}`;
            }
          } else {
            // typedDataCard controls are exempt from prefix validation
            child.status = true;
            child.remarks = "";
          }
        }

        // Recurse only for controls
        validateNameStandards(child, codeStandards);
      }
    }
  }

  return node;
}


function validateCodeStandards(child: any, codeStandards: any): any {
  // Ensure child has a _children array to add validation results
  child._children = child._children || [];

  const code = child.script || "";
  // Split code by semicolon to process each statement
  const codeSplit = code.split(";").map((s: any) => s.trim()).filter(Boolean);

  codeSplit.forEach((item: string) => {
    let matchFound = false;

    const newChild: any = {
      name: child.name,          // inherit parent's name
      type: "Collection",        // default type to Collection
      script: "",                // actual code line or variable name
      status: "",                // validation status
      remarks: "",
      _children: []              // leaf by default
    };

    // --- Validate ClearCollect or Collect usage ---
    const collMatch = item.match(/(?:ClearCollect|Collect)\(\s*(\w+)/i);
    if (collMatch) {
      matchFound = true;
      const collName = collMatch[1];
      const prefix = codeStandards.find((item: any) => item.ctrl === "Collection")?.prefix || "col";
      if (!collName.startsWith(prefix)) {
        newChild.type = "Collection";
        newChild.status = "false";
        newChild.script = collName;
        newChild.remarks = `Collection '${collName}' should start with '${prefix}'`;
      }
      else {
        newChild.status = "true";
        newChild.script = collName;
        newChild.remarks = "pass";
      }
    }

    // --- Validate Navigate function and its variables ---
    const navMatch = item.match(/Navigate\(\s*([^,]+)\s*,/i);
    if (navMatch) {
      let match = item.match(/\{([\s\S]*)\}/);
      if (match) {
        let jsonStr = `${match[0]}`;
        const prefix = codeStandards.find((item: any) => item.ctrl === "Navigate")?.prefix || "_nloc";

        const innerMatch = jsonStr.match(/\{([\s\S]*)\}/);
        if (innerMatch) {
          let inner = innerMatch[1];  // extract object content
          // Extract keys used in the navigation context object
          let keysOnly = [...inner.matchAll(/"?([a-zA-Z0-9_]+)"?\s*:/g)].map(m => m[1]);

          if (keysOnly.length > 0) {
            matchFound = true;
            newChild.type = "Navigate";
            newChild.script = item;
            newChild.status = "";
            newChild.remark = "";

            // Validate each key against the prefix
            keysOnly.forEach(v => {
              if (!v.startsWith(prefix)) {
                let node = {
                  name: child.name,
                  type: "UpdateContextRecord",
                  status: "false",
                  script: v,
                  remarks: `UpdateContext variable '${v}' should start with '${prefix}'`
                };
                newChild._children.push(node);
              }
              else {
                let node = {
                  name: child.name,
                  type: "UpdateContextRecord",
                  status: "true",
                  script: v,
                  remarks: "pass"
                };
                newChild._children.push(node);
              }
            });
          }
        }
      }
    }

    // --- Validate Set function for global variables ---
    const setMatch = item.match(/Set\(\s*([^,]+)\s*,/i);
    if (setMatch) {
      matchFound = true;
      const variable = setMatch[1].trim();
      const prefix = codeStandards.find((item: any) => item.ctrl === "Set")?.prefix || "gbl";
      if (!variable.startsWith(prefix)) {
        newChild.type = "GlobalVariable";
        newChild.status = "false";
        newChild.script = variable;
        newChild.remarks = `Set variable '${variable}' should start with '${prefix}'`;
      }
      else {
        newChild.type = "GlobalVariable";
        newChild.status = "true";
        newChild.remarks = "pass";
        newChild.script = variable;
      }
    }

    // --- Validate UpdateContext function for local variables ---
    if (/UpdateContext\s*\(/i.test(item)) {
      matchFound = true;

      newChild.type = "UpdateContext";
      newChild.script = item;
      newChild.status = "";
      newChild.remark = "";

      const prefix = codeStandards.find((item: any) => item.ctrl === "UpdateContext")?.prefix || "loc";
      const match = item.match(/\{([\s\S]*)\}/);
      if (match) {
        let jsonStr = `${match[0]}`;
        const innerMatch = jsonStr.match(/\{([\s\S]*)\}/);
        if (innerMatch) {
          let inner = innerMatch[1];  // extract object content
          // Extract keys used in UpdateContext object
          let keysOnly = [...inner.matchAll(/"?([a-zA-Z0-9_]+)"?\s*:/g)].map(m => m[1]);
          // Validate each key against prefix
          keysOnly.forEach(v => {
            if (!v.startsWith(prefix)) {
              let node = {
                name: child.name,
                type: "LocalVariable",
                status: "false",
                script: v,
                remarks: `UpdateContext variable '${v}' should start with '${prefix}'`
              };
              newChild._children.push(node);
            }
            else {
              let node = {
                name: child.name,
                type: "LocalVariable",
                status: "true",
                script: v,
                remarks: "pass"
              };
              newChild._children.push(node);
            }
          });
        }
      }
    }

    // Add the validation result node to the parent's children if any match was found
    if (matchFound) {
      child._children.push(newChild);
    }
  });

  return child;
}