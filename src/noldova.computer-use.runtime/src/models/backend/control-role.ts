/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class ControlRole {
  public static readonly Window: ControlRole = new ControlRole("Window");
  public static readonly Dialog: ControlRole = new ControlRole("Dialog");
  public static readonly MenuBar: ControlRole = new ControlRole("MenuBar");
  public static readonly Menu: ControlRole = new ControlRole("Menu");
  public static readonly MenuItem: ControlRole = new ControlRole("MenuItem");
  public static readonly Toolbar: ControlRole = new ControlRole("Toolbar");
  public static readonly Button: ControlRole = new ControlRole("Button");
  public static readonly CheckBox: ControlRole = new ControlRole("CheckBox");
  public static readonly Radio: ControlRole = new ControlRole("Radio");
  public static readonly ComboBox: ControlRole = new ControlRole("ComboBox");
  public static readonly Edit: ControlRole = new ControlRole("Edit");
  public static readonly Text: ControlRole = new ControlRole("Text");
  public static readonly Link: ControlRole = new ControlRole("Link");
  public static readonly Image: ControlRole = new ControlRole("Image");
  public static readonly List: ControlRole = new ControlRole("List");
  public static readonly ListItem: ControlRole = new ControlRole("ListItem");
  public static readonly Tree: ControlRole = new ControlRole("Tree");
  public static readonly TreeItem: ControlRole = new ControlRole("TreeItem");
  public static readonly Table: ControlRole = new ControlRole("Table");
  public static readonly Row: ControlRole = new ControlRole("Row");
  public static readonly Cell: ControlRole = new ControlRole("Cell");
  public static readonly Header: ControlRole = new ControlRole("Header");
  public static readonly Tab: ControlRole = new ControlRole("Tab");
  public static readonly TabList: ControlRole = new ControlRole("TabList");
  public static readonly Slider: ControlRole = new ControlRole("Slider");
  public static readonly ProgressBar: ControlRole = new ControlRole("ProgressBar");
  public static readonly ScrollBar: ControlRole = new ControlRole("ScrollBar");
  public static readonly Group: ControlRole = new ControlRole("Group");
  public static readonly Pane: ControlRole = new ControlRole("Pane");
  public static readonly Document: ControlRole = new ControlRole("Document");
  public static readonly Other: ControlRole = new ControlRole("Other");
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public get isContainer(): boolean {
    return this === ControlRole.Group || this === ControlRole.Pane;
  }
}
