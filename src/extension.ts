// import { IStashedItem } from "./../webviews/global.d";
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
      sidebarProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("stash-tabs.add", async (inputValue?: string) => {
      const { activeTextEditor } = vscode.window;

      if (!activeTextEditor) {
        vscode.window.showInformationMessage("No active text editor");
        return;
      }

      const nameInput = inputValue || await vscode.window.showInputBox();
      const closeQuestion = await vscode.window.showInformationMessage("Want to close tabs after stashing?", "Yes", "No");

      const paths = vscode.workspace.textDocuments.map(
        (doc) => doc
      );

      if (!paths || !nameInput) {
        return;
      } 
      
      const value = {
        name: nameInput,
        tabPaths: paths
      };
      
      sidebarProvider._view?.show();
      sidebarProvider._view?.webview.postMessage({
        type: "add-stash",
        value: value,
      });

      if (closeQuestion === "Yes") {
        vscode.commands.executeCommand("openEditors.closeAll")
      }
      

      // const text = activeTextEditor.document.getText(
      //   activeTextEditor.selection
      // );
      // var currentlyOpenTabfilePath = vscode.window.activeTextEditor?.document.uri.fsPath;

      // for (const document of vscode.workspace.textDocuments) {
      //   const theName = document.fileName;
      //   console.log(
      //     "🚀 ~ file: extension.ts ~ line 47 ~ vscode.commands.registerCommand ~ theName",
      //     theName
      //   );
      // }

      // sidebarProvider._view?.webview.postMessage({
      //   type: "add",
      //   value: paths,
      // });
    })
  );

  // context.subscriptions.push(
  //   vscode.commands.registerCommand("stash-changes.askQuestion", async () => {
  //     const answer = await vscode.window.showInformationMessage(
  //       "How was your day?",
  //       "Good",
  //       "Bad"
  //     );

  //     if (answer === "Bad") {
  //       vscode.window.showInformationMessage("Sorry to hear that");
  //     } else {
  //       console.log({ answer });
  //       vscode.window.showInformationMessage("Nice! Have a nice day");
  //     }
  //   })
  // );

  // context.subscriptions.push(
  //   vscode.commands.registerCommand("stash-changes.refresh", () => {
  //     HelloWorldPanel.kill();
  //     HelloWorldPanel.createOrShow(context.extensionUri);

  //     setTimeout(() => {
  //       vscode.commands.executeCommand(
  //         "workbench.action.webview.openDeveloperTools"
  //       );
  //     }, 500);
  //   })
  // );
}

// this method is called when your extension is deactivated
export function deactivate() {}
