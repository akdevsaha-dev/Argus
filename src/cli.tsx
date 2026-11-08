#!/usr/bin/env node
import "dotenv/config";
import React from "react";
import { render } from "ink";
import App from "./ui/App.js";

// Full-screen, like Codex: the app owns the alternate screen and scrolls its
// own transcript, leaving the shell untouched when it exits.
render(<App />, { alternateScreen: true, exitOnCtrlC: true });
