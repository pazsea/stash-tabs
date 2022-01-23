import * as vscode from "vscode";
import { SidebarProvider } from "./SidebarProvider";

export function activate(context: vscode.ExtensionContext) {
  const sidebarProvider = new SidebarProvider(context.extensionUri);

  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right
  );
  item.text = "Stash tabs";
  item.command = "stash-tabs.add";
  item.show();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "stash-tabs-sidebar",
      sidebarProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "stash-tabs.add",
      async (inputValue?: string) => {
        const { activeTextEditor } = vscode.window;

        if (!activeTextEditor) {
          vscode.window.showInformationMessage("No active text editor");
          return;
        }

        const nameInput = inputValue || (await vscode.window.showInputBox());
        const closeQuestion = await vscode.window.showInformationMessage(
          "Want to close tabs after stashing?",
          "Yes",
          "No"
        );

        const paths = vscode.workspace.textDocuments.map((doc) => {
          if (doc?.uri?.scheme !== "file") {
            return;
          }
          return doc;
        });

        if (!paths || !nameInput) {
          return;
        }

        const value = {
          name: nameInput,
          tabPaths: paths,
        };

        sidebarProvider._view?.show();
        sidebarProvider._view?.webview.postMessage({
          type: "add-stash",
          value: value,
        });

        if (closeQuestion === "Yes") {
          vscode.commands.executeCommand("openEditors.closeAll");
        }
      }
    )
  );
}

export function deactivate() {}
