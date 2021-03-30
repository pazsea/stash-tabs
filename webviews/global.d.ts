import * as _vscode from "vscode";
import { IStashedItem } from './global.d';

export interface IStashedItem {
  name: string;
  isOpen: boolean;
  tabPaths: string[];
}

declare global {
  const tsvscode: {
    postMessage: ({ type: string, value: any }) => void;
  };
}
