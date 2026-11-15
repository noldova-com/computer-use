/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ControlRole } from "@noldova/computer-use.runtime";

describe("ControlRole", () => {
  it("has one list of roles for every platform", () => {
    const roles = [
      ControlRole.Window, ControlRole.Dialog, ControlRole.MenuBar, ControlRole.Menu, ControlRole.MenuItem, ControlRole.Toolbar, ControlRole.Button,
      ControlRole.CheckBox, ControlRole.Radio, ControlRole.ComboBox, ControlRole.Edit, ControlRole.Text, ControlRole.Link, ControlRole.Image,
      ControlRole.List, ControlRole.ListItem, ControlRole.Tree, ControlRole.TreeItem, ControlRole.Table, ControlRole.Row, ControlRole.Cell,
      ControlRole.Header, ControlRole.Tab, ControlRole.TabList, ControlRole.Slider, ControlRole.ProgressBar, ControlRole.ScrollBar,
      ControlRole.Group, ControlRole.Pane, ControlRole.Document, ControlRole.Other
    ];

    assert.deepEqual(roles.map(t => t.value), [
      "Window", "Dialog", "MenuBar", "Menu", "MenuItem", "Toolbar", "Button", "CheckBox", "Radio", "ComboBox", "Edit", "Text", "Link", "Image",
      "List", "ListItem", "Tree", "TreeItem", "Table", "Row", "Cell", "Header", "Tab", "TabList", "Slider", "ProgressBar", "ScrollBar",
      "Group", "Pane", "Document", "Other"
    ]);
    assert.deepEqual(roles.filter(t => t.isContainer), [ControlRole.Group, ControlRole.Pane]);
  });
});
