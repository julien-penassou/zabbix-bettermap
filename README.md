# Better Maps: draw.io-style network maps for Zabbix 7.2

🌐 **English** · [Français](README.fr.md)

This frontend module adds **Monitoring › Maps+**, a map editor that is independent of Zabbix's built-in maps:

- **curved**, straight or orthogonal links, which you bend by dragging them with the mouse;
- draw.io-style link handling: fixed connection points or floating ends, automatic orthogonal routing with movable segments, rounded corners, live preview while drawing;
- movable waypoints (snapping to the alignment of their neighbours), ends that can be reconnected from one node to another, a label that can be moved along the link;
- parallel links (LACP, redundancy) spread apart automatically;
- Zabbix hosts with vector icons, a status badge and a pulsing halo for High and Disaster problems;
- custom icons (SVG, PNG, JPEG, GIF, WebP, 1 MB max) added and deleted from the editor and shared by all maps; SVG files containing scripts, event handlers, a DTD or external references are rejected;
- host and group labels at the bottom, top, left or right (per node, or as a default for the whole map), with links routed around them; or no icon at all, with the label written inside the box;
- host groups: combined status of the group's monitored hosts (highest severity, number of problems, hosts in problem);
- items: latest value shown live (units and value mappings applied), status based on the item's triggers;
- triggers: OK / PROBLEM state in the severity colours, active problems on click;
- links coloured by the severity of the problems on their ends (host, group, item or trigger), or of one or more other triggers chosen for the link, combined with OR (at least one in problem) or AND (all in problem);
- areas (rectangles, ellipses) and free text, with text formatting: font, size, colour, bold, italic, underline, horizontal (left, centre, right) and vertical (top, middle, bottom) alignment;
- undo/redo, copy/paste (including between two maps), align and distribute, snap to grid;
- view mode: automatic refresh, popup when clicking a node or a link (state, problems, links to problems, graphs and latest data), full screen;
- JSON export and import;
- works with Zabbix's light and dark themes;
- English and French interface, following the Zabbix language (see [Languages](#languages)).

The same module also provides the **Map+** widget, which shows these maps on a dashboard.

📖 **[User guide](docs/guide-utilisateur.md)** (in French): viewing, creating and editing maps, step by step with screenshots.

## Installation

1. Copy the `bettermaps/` folder into the `modules/` folder of the Zabbix frontend:
   ```bash
   cp -r bettermaps /usr/share/zabbix/modules/
   ```
   Depending on how Zabbix was installed, this folder may also be `/usr/share/zabbix/ui/modules/` or `/var/www/html/zabbix/modules/`. It is the folder that already contains `widgets/`.
2. In Zabbix, go to **Administration › General › Modules**, click **Scan directory**, then enable **Better Maps**.
3. The **Monitoring › Maps+** menu appears, and the **Map+** widget type is available on dashboards.

> **Upgrading from version 1.0** (two modules): delete the `bettermapswidget/` folder, copy `bettermaps/` again, then click **Scan directory**. Widgets added with version 1.0 must be recreated, because the widget type was renamed. The maps themselves are kept.

On first use, the module creates a `bettermaps_map` table in the Zabbix database (PostgreSQL or MySQL). If the frontend's database user does not have the `CREATE` privilege, create the table by hand with [bettermaps/sql/create_table.sql](bettermaps/sql/create_table.sql).

> The table is backed up along with the rest of the Zabbix database. Zabbix upgrades do not touch it.

## Permissions

| Action | Requirement |
|---|---|
| View maps | access to the "Monitoring › Maps" UI element in the user role |
| Create, edit, delete | Admin or Super admin user type, with the "Create and edit maps" action |
| Status of hosts, groups, items and triggers | through the Zabbix API: each user only sees the objects they have access to |

## Using the editor

| Gesture | Effect |
|---|---|
| + Host, + Group, + Item, + Trigger | add a Zabbix object, chosen in the side panel (for an item or a trigger: the host first, then the object) |
| Hover over a node, drag from a blue point… | create a link attached to that point |
| … and release on a blue point of another node | fixed end (the point snaps when you get close) |
| … and release in the middle of a node | floating end (follows the nearest side) |
| … and release in empty space | creates a new node with the same appearance, already linked |
| Drag a curved or straight link | bend it (adds a waypoint) |
| Drag a solid point / a hollow point | move / add a waypoint |
| Drag the handle of an orthogonal segment | shift that segment parallel to itself |
| Drag the label of a link | move it along the link |
| Double-click a point | remove it |
| Double-click the handle of an orthogonal segment | remove that jog (its two corners) |
| Double-click a link or a node | edit its label |
| Drag an end of a selected link | reconnect it (fixed point or floating) |
| Drag in empty space (Shift to add) | rectangle selection |
| Mouse wheel | zoom |
| Space + drag, or right-click + drag | move the view |
| Ctrl+Z / Ctrl+Y, Ctrl+C / Ctrl+V, Ctrl+D, Del, arrow keys, Ctrl+S | the usual shortcuts |

## Dashboard widget

1. Open a dashboard, click **Edit dashboard**, then **Add**.
2. Choose the **Map+** type, select the map, then apply and save the dashboard.

![widget](docs/apercu-widget.png)

- If the widget name is left empty, the map name is shown.
- The status is refreshed according to the widget's refresh interval (30 s by default). The zoom level and any open popup are kept, and changes to the map are picked up automatically.
- The widget is read-only. Clicking a host, group, item or trigger shows its problems. Zoom buttons appear on hover, and the ↗ button opens the full map.
- **Ctrl + mouse wheel** zooms. The mouse wheel alone scrolls the dashboard, as usual.
- The map is refitted when the widget is resized.

## Languages

The module's interface (menu, pages, editor, widget, error messages) follows the Zabbix language. This is the server language (**Administration › General › GUI › Default language**) as long as the user keeps "System default" in their profile, otherwise the language they chose. French is included, and any other language is displayed in English.

In French, the menu is called **Surveillance › Cartes+** and the widget **Carte+**.

To add a language (for example `de`, from the first two letters of the Zabbix locale):

1. copy [bettermaps/assets/js/lang.fr.js](bettermaps/assets/js/lang.fr.js) to `lang.de.js`, translate the values and replace `fr` with `de` on the `window.BetterMapsLang.fr` line;
2. add `lang.de.js` to `assets` › `js` in [bettermaps/manifest.json](bettermaps/manifest.json), before `bettermap.js`;
3. copy [bettermaps/lang/fr.php](bettermaps/lang/fr.php) to `lang/de.php` and translate it.

Any entry missing from a catalogue is displayed in English.

## Test environment

[test/docker-compose.yml](test/docker-compose.yml) starts a complete Zabbix 7.2 (PostgreSQL) with the module mounted live:

```bash
cd test && docker compose up -d     # http://localhost:8099  (Admin / zabbix)
```

## Layout

```
bettermaps/
├── manifest.json              "widget" type module: Maps+ pages + Map+ widget
├── Widget.php                 widget name, adds the menu entry
├── actions/                   controllers: list, view, create, save, delete,
│                              host / group / item / trigger search, status, widget content (WidgetView.php)
├── includes/                  widget form (map choice, zoom buttons)
├── lib/                       SQL storage, status of Zabbix objects, permissions, assets, translations,
│                              base class of the JSON controllers
├── lang/                      translations of the server-side messages (fr.php)
├── views/                     list and map pages, widget view and form
├── assets/js/bettermap.js     the SVG editor (no dependencies)
├── assets/js/lang.fr.js       French translation of the editor and the widget
├── assets/js/class.widget.js  JS class of the widget
├── assets/css/bettermap.css
└── sql/create_table.sql       manual table creation (fallback)
```

Zabbix only loads the JS and CSS of a "widget" type module on dashboards. The Maps+ pages therefore include them themselves (see `lib/Assets.php`). Other Zabbix pages do not load the editor.

## License

Copyright (C) 2026 Julien Penassou

Better Maps is free software, distributed under the **GNU Affero General Public License version 3** (AGPL-3.0), the same license as Zabbix. The full text is in the [LICENSE](LICENSE) file.

You may use, study, modify and redistribute this module. Any modified version, whether redistributed or made available on a server, must be published under the same license, with its source code.

This module comes with no warranty.
