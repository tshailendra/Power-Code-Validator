# Power Code Validator README

Power Code Validator is a Visual Studio Code extension that helps enforce naming and validation standards in **Canvas Apps**. It automatically checks your app for consistency, ensuring controls, variables, and prefixes follow project-specific rules.

## Key Features
- 🔍 Validates control prefixes against configurable project standards
- 🛠 Ensures all variables are properly declared
- ⚡ Provides quick feedback directly inside VS Code
- 📂 Customizable configuration for project-specific naming rules
- 🚀 Helps maintain consistency and best practices across large Canvas Apps
- 📊 Reduces manual code review effort by automating validations 


## Code Validation in Action

The Power Code Validator makes it easy to identify naming and coding standard issues in your Canvas Apps.  From the main screen, you can quickly review all controls, variables, and prefixes against the configured project standards.

![initialscreen](images/screen1.png)

<br>

The **Control Name Standards** screen allows you to configure and verify the naming prefixes used for each control type in your Canvas Apps.  By maintaining consistent prefixes, your project remains clean, standardized, and easier to maintain.
 
![Control Name Standards](images/screen2.png)

<br>

The Canvas App Selection screen provides a list of available apps from the environment. Choose the app to run validation against, ensuring that code and naming standards are applied to the correct project.

![Canvas App Selection](images/screen3.png)

<br>

View list of all the screens contained within the selected Canvas App.  This provides a clear overview of the app structure, helping users navigate through screens and apply validations at the correct level.

![App Screens](images/screen4.png)

<br>

The Control Details displays all controls and their associated formulas within the selected screen.  This allows users to validate control naming conventions and verify code consistency according to project standards.

![Control Details](images/screen5.png)

<br>


## Runtime Dependency

This extension uses the following runtime dependency:

- **[unzipper](https://www.npmjs.com/package/unzipper)** – used to extract and process `.zip` files, which is required when unpacking Canvas App source files for validation.


## Extension Settings

This extension contributes the following settings:

* `powercodevalidator.enable`: Enable/disable the Code Validator extension (default: `true`).


## Known Issues

- ❌ Does not validate or detect errors in **Power Fx** formulas
- 🔄 Changes based on project standards must be manually applied in the Canvas App; no automation is provided
- ⚠️ Limited to naming and validation checks; does not cover performance or accessibility issues


## Release Notes

Users appreciate release notes as you update your extension.


## 1.0.0

Initial release of ...


## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
