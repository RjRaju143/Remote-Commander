# **App Name**: Remote Commander

## Core Features:

- User Authentication: Allow users to log into the web app to access server management features.
- Server Credential Storage: Store server connection details (IP, port, username, encrypted private key) securely.
- Server Selection: List servers with saved credentials for quick selection.
- Interactive Terminal: Open an interactive terminal in the browser upon server selection, powered by xterm.js.
- SSH Connection: Establish an SSH connection to the selected server and stream command input/output.
- Session Management: Keep track of the user's active sessions and disconnect when the user logs out.
- AI command classifier: Use an AI tool to classify commands into predefined categories, so users can ask questions about most used commands.

## Style Guidelines:

- Primary color: Electric blue (#7DF9FF), symbolizing connectivity and control.
- Background color: Dark gray (#28282B), for a modern, focused interface.
- Accent color: Lime green (#32CD32) to indicate active connections or status.
- Font pairing: 'Space Grotesk' (sans-serif) for headlines and short descriptions paired with 'Inter' (sans-serif) for body text and terminal output.
- Code font: 'Source Code Pro' for command snippets.
- Use system-style icons related to server management actions and status. Icons should be monochrome in shades of electric blue or lime green.
- Divide the UI into logical sections such as Server List, Active Connections, and Terminal Output for improved usability.