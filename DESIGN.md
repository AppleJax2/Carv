# CNCraft — A Modern CNC Controller

## Vision

CNCraft is a desktop application that makes CNC machining feel intuitive and approachable. Where existing tools like Universal Gcode Sender prioritize function over form, CNCraft treats the operator's experience as paramount. The interface should feel like a well-designed instrument panel: every piece of information visible at a glance, every control within reach, and nothing extraneous cluttering the view.

The application runs on Windows, macOS, and Linux. It connects to GRBL-based controllers over USB serial, with architecture that allows future expansion to other firmware like grblHAL, Marlin, or FluidNC. Updates ship automatically through GitHub releases, so users always have the latest improvements without manual downloads.

---

## The First Launch Experience

When a user opens CNCraft for the first time, they see a clean welcome screen with a single clear action: connect to your machine. The application scans available serial ports and presents them as recognizable options—not cryptic COM port numbers, but friendly labels where possible (showing the USB device name when available). 

If no machine is detected, the app doesn't leave the user stranded. It offers a simulation mode where they can explore the interface, load G-code files, and understand the workflow before their hardware arrives. This simulation mode uses a virtual GRBL controller that responds realistically to commands, complete with simulated movement timing.

Once connected, the welcome screen dissolves into the main workspace. There's no configuration wizard demanding attention—sensible defaults get the user operational immediately. Advanced settings exist but stay out of the way until needed.

---

## The Main Workspace

The workspace divides into zones that mirror the operator's mental model of CNC work.

**The Machine Status Bar** runs across the top, always visible regardless of what else is happening. It shows connection state (with the port name and baud rate), current machine state (Idle, Run, Hold, Alarm, etc.), and the active work coordinate system (G54 through G59). When an alarm triggers, this bar turns amber and displays the alarm code with a human-readable explanation—not just "Alarm 2" but "Alarm 2: Soft limit triggered on Y axis." A single click clears the alarm after the user has addressed the underlying issue.

**The Position Display** occupies the upper left quadrant. It shows both machine coordinates and work coordinates simultaneously, with the active coordinate system emphasized. Numbers update in real-time during movement, with smooth interpolation that feels responsive without being jittery. Each axis displays to three decimal places by default (appropriate for most hobby machines), with an option for four decimals in settings. Below the numeric display, simple bar graphs show each axis position relative to the machine's travel limits, giving an instant spatial sense of where the tool currently sits in the work envelope.

**The Visualizer** fills the upper right quadrant. It renders a 3D view of the loaded toolpath using Three.js, with the current tool position marked by a distinctive indicator. As a job runs, completed moves fade to a different color while upcoming moves remain bright, creating an intuitive progress indication. The camera can orbit, pan, and zoom with mouse controls matching CAD software conventions (middle-click to orbit, scroll to zoom, shift-middle to pan). A toolbar offers preset views: top-down, isometric, and front/side elevations. The visualizer also shows a ghost outline of the machine's work envelope, helping operators understand how their part fits within available travel.

**The Control Panel** occupies the lower left. This is where hands-on machine operation happens. A jog control cluster provides directional buttons arranged in an intuitive compass pattern for X and Y, with Z up/down buttons alongside. Jog distance presets (0.1mm, 1mm, 10mm, 100mm) appear as toggle buttons—click once to select, then each jog button moves that increment. A continuous jog mode allows holding a button for smooth movement, with acceleration ramping that feels natural. Keyboard shortcuts mirror the button layout: arrow keys for X/Y, Page Up/Down for Z, with number keys selecting jog increments.

Below the jog controls sit the spindle and feed controls. A spindle toggle shows current RPM (when using a PWM spindle) or simply On/Off for relay-controlled spindles. A feed override slider runs from 10% to 200%, with the current percentage displayed prominently. Rapid override gets its own slider. These overrides affect running jobs in real-time, letting operators tune speeds on the fly as they learn how their material and tooling behave.

**The Job Panel** fills the lower right. When no file is loaded, it shows a drop zone inviting the user to drag a G-code file or click to browse. Once loaded, it displays the filename, estimated run time (calculated from the G-code with current feed rates), and line count. A scrubber bar allows previewing any point in the file, with the visualizer updating to show the toolpath up to that point. 

The primary job controls are large and unambiguous: a green Play button to start, a yellow Pause button that triggers a feed hold, and a red Stop button that halts the job entirely. The Stop button requires a confirm tap (or a long press) to prevent accidental job cancellation. During a job, a progress indicator shows percentage complete, elapsed time, and estimated remaining time. The current G-code line displays with a few lines of context above and below, scrolling automatically as the job progresses.

---

## The Console

A collapsible console panel slides up from the bottom of the screen. It shows the raw communication log between the application and the controller—every command sent and every response received. This transparency helps users understand what's happening and aids debugging when things go wrong.

The console includes a command input field where users can type raw G-code or GRBL commands. Common commands have autocomplete suggestions: typing "$" shows GRBL settings options, typing "G" suggests common G-codes with brief descriptions. Sent commands appear in the log with a distinctive style, making it easy to trace cause and effect.

A filter toggle hides the routine status polling messages that would otherwise flood the log, showing only substantive commands and responses. The log is searchable and can be exported to a text file for sharing or record-keeping.

---

## Work Coordinate Management

Setting up work coordinates is one of the most frequent CNC tasks, and CNCraft makes it fluid. The Position Display includes touch targets on each axis. Tapping an axis opens a popover with options: Zero (set current position as zero), Go To Zero (rapid to the zero point), Set Value (enter a specific coordinate), and Go To Value (move to a specific coordinate).

For the common workflow of touching off a workpiece, the user jogs to the corner, taps X, selects Zero, taps Y, selects Zero, then touches the top surface and zeros Z. Three taps and the work coordinate system is set. The visualizer immediately updates to show the toolpath positioned relative to the new zero point.

A dedicated Work Coordinates panel (accessible from a tab or sidebar) shows all six work coordinate systems (G54-G59) in a table format. Users can name each one ("Vise Left Corner," "Fixture A") and see the offset values. Switching active coordinate systems is a single click. This panel also offers a "capture current position" button that records the current location into any selected coordinate system.

---

## Probing Workflows

CNCraft includes guided probing routines that turn complex measurement tasks into step-by-step wizards. Each routine explains what it will do, shows a diagram of the expected probe movement, and asks for necessary parameters (like probe diameter or expected surface location).

The Z-probe routine is the simplest: the user positions the probe over the touch plate, enters the plate thickness, and clicks Start. The machine probes downward, touches the plate, and automatically sets Z zero accounting for the plate thickness. A confirmation shows the measured value before applying it.

Edge finding routines probe the side of a workpiece to find its edge. The user indicates which edge (left, right, front, back) and the probe moves accordingly, touching the surface and calculating the edge position accounting for probe tip radius.

Corner finding combines two edge probes to locate a corner precisely. Center finding probes opposite edges to find the center of a bore or boss. Each routine shows its progress visually and allows cancellation at any point.

For users with touch probes rather than simple touch plates, the routines adapt their approach speeds and pull-off distances appropriately. Probe configuration lives in settings, where users specify their probe type, diameter, and preferred speeds.

---

## Macros and Custom Commands

Power users accumulate workflows specific to their machines and projects. CNCraft provides a macro system that captures these as reusable commands.

A macro is simply a sequence of G-code lines with a name and optional keyboard shortcut. The macro editor provides syntax highlighting and validation, warning about potentially dangerous commands (like rapid moves to absolute coordinates that might crash depending on current position). Macros can include simple variable substitution—a facing routine might prompt for width and depth parameters each time it runs.

The macro library panel shows all saved macros as a grid of buttons. Users can organize them into categories (Setup, Probing, Cleanup, Project-Specific) and reorder them freely. During a job, macros are disabled to prevent interference, but they're available instantly when the machine is idle.

Common starter macros ship with the application: a homing sequence, a "go to front-left corner" parking move, a spindle warm-up routine, and a tool change pause sequence. Users can modify or delete these as they develop their own preferences.

---

## Settings and Configuration

Settings organize into logical groups accessible from a sidebar within the settings panel.

**Connection settings** specify default baud rate, connection timeout, and status polling interval. Most users never touch these, but they're available for unusual configurations.

**Machine settings** define soft limits, maximum travel, and homing direction for each axis. These can be read directly from the GRBL controller's EEPROM settings, edited in the application, and written back. A "read from controller" button pulls current values, and a "write to controller" button pushes changes. The application warns before writing, since incorrect values can cause crashes or lost position.

**Display settings** control units (mm or inches, affecting all displays and inputs), decimal precision, and visualizer appearance (background color, toolpath colors, grid visibility).

**Keyboard shortcuts** are fully customizable. A searchable list shows all available actions with their current bindings. Clicking a binding and pressing a new key combination reassigns it. Conflicts are highlighted immediately. A reset button restores defaults.

**Updates** show the current version, check for updates on demand, and configure automatic update behavior (download and install automatically, download and prompt, or notify only).

---

## Error Handling and Recovery

CNC machines encounter problems: limit switches trigger unexpectedly, tools break, stock shifts. CNCraft handles these situations gracefully.

When an alarm occurs, the application immediately shows a modal explaining the alarm in plain language, not just the code. It offers contextual actions: for a limit switch alarm, buttons to unlock and carefully jog away from the limit; for a probe failure, options to retry or abort the probing routine.

If connection drops mid-job, the application preserves the job state and offers recovery options when connection restores. It shows exactly which line was last confirmed complete, allowing the user to resume from that point or restart entirely. A "dry run from line N" option lets users verify the recovery point by running subsequent moves with the spindle off.

The application maintains a job history log, recording start time, end time (or failure point), filename, and any errors encountered. This history helps users track their work and diagnose recurring issues.

---

## Performance and Reliability

The application separates concerns carefully between the Electron main process and renderer process. Serial communication happens entirely in the main process, isolated from UI rendering. This ensures that complex visualizer updates or UI interactions never starve the serial buffer or cause communication hiccups.

G-code streaming uses a look-ahead buffer that keeps the controller's planner full without overwhelming it. The application monitors the controller's buffer status and adjusts sending rate dynamically. This achieves smooth motion even on complex toolpaths while remaining responsive to feed hold commands.

The visualizer uses level-of-detail techniques for large files. A million-line G-code file might take a moment to parse initially, but once loaded, the view remains fluid. Very long straight moves simplify to single lines; dense curve approximations retain detail only when zoomed in.

All user data (macros, settings, work coordinate names) persists to local JSON files in the application data directory. These files use atomic writes to prevent corruption from unexpected shutdowns. The application can export and import complete configurations, making it easy to transfer setups between computers or share configurations with others.

---

## Visual Design

The interface uses a dark theme by default, reducing eye strain in shop environments that often have mixed lighting. Colors are chosen for clarity: green indicates safe/go states, amber indicates caution/pause states, red indicates stop/alarm states. These colors appear consistently throughout—the Play button, the Idle status, and successful probe completion all share the same green.

Typography prioritizes readability at arm's length. Position displays use a monospace font sized generously, legible from several feet away. Labels use a clean sans-serif at comfortable reading sizes. Nothing requires squinting.

Interactive elements have generous touch targets, acknowledging that users might be wearing gloves or operating with greasy fingers. Buttons have clear hover and active states. Destructive actions (stop job, clear coordinates) require confirmation through a second tap or long press.

The layout responds to window size. On a large monitor, all panels display simultaneously. On a smaller screen, panels can collapse or tab, letting users prioritize what they need for their current task. A "focus mode" hides everything except the visualizer and essential job controls, maximizing the view during long runs.

---

## Future Considerations

The architecture anticipates growth without overbuilding for the initial release.

Controller abstraction means adding support for grblHAL, Marlin, or FluidNC requires implementing a new protocol handler without touching UI code. Each controller type registers its capabilities (number of axes, supported features, status format), and the UI adapts accordingly.

A plugin system could eventually allow community extensions: custom visualizer overlays, integration with tool databases, connection to cloud storage for G-code files. The initial release doesn't include this, but the codebase avoids patterns that would make it difficult to add later.

Multi-machine support (connecting to several controllers simultaneously) is architecturally possible but deferred. The serial communication layer already treats connections as independent instances; the UI would need work to manage multiple machine contexts.

Remote operation (controlling a machine over the network) raises safety concerns that require careful consideration. The foundation exists—the main process could expose its API over WebSocket—but this feature needs thoughtful design around authentication, latency handling, and emergency stop reliability before implementation.

---

## Summary

CNCraft aims to be the CNC controller that operators actually enjoy using. It respects their time by making common tasks fast and obvious. It respects their intelligence by providing depth and customization without requiring it. It respects their investment by running reliably and staying current through automatic updates.

The measure of success is simple: when someone finishes a project on their CNC, the software should have been a help, not a hurdle.
