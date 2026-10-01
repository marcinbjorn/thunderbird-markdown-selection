# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A Thunderbird MailExtension (manifest v2, targets Thunderbird 128+, tested on 156) that adds a compose-window toolbar button. Clicking it renders the currently selected Markdown text in the message body as HTML. There is no build system, package.json, tests, or linter; the source files are plain JavaScript loaded directly by Thunderbird.

## Architecture

Two halves communicate by message passing:

- background.js: registers compose.js with browser.composeScripts.register (Thunderbird has no manifest key for compose scripts; a compose_scripts key in manifest.json is silently ignored). On browser.composeAction.onClicked it sends {command: "render-selected-markdown"} to the compose tab and shows a notification if the reply is not {ok: true}.
- highlight.min.js: bundled highlight.js 11.11.1 (all 192 languages, bundled from the npm package with esbuild, with var hljs appended), registered before compose.js. Fenced blocks with a language tag are highlighted and the hljs-* classes are rewritten to inline colors via TOKEN_COLORS in compose.js.
- supported-languages.html and supported-languages.js: searchable language list opened in a popup from the "Markdown code languages" right-click item in background.js. The data is a generated snapshot of hljs.listLanguages(); regenerate it if highlight.min.js changes. Inline scripts are not allowed in extension pages, hence the separate .js.
- compose.js: runs inside the compose editor. It listens for that message, converts window.getSelection() text to HTML with a small built-in Markdown converter (headings, lists, quotes, fences, inline code, bold, italic, links, images), and replaces the selection. It replies with {ok, error}. Rendering only works in HTML compose windows. Code blocks and inline code get inline grey styles (mail clients strip classes). The same button toggles: if the selection already contains rendered elements (headings, bold, pre, lists, links, etc.), it is converted back to Markdown source instead.

Compose scripts registered at runtime only apply to compose windows opened after the add-on loads, so reopen the compose window after reloading the add-on.

## Packaging

render-selected-markdown.xpi is a zip of the extension files, committed alongside the source and not regenerated automatically. Rebuild it after changing source files, from PowerShell:

Compress-Archive -Path manifest.json,background.js,compose.js,highlight.min.js,supported-languages.html,supported-languages.js,icon.svg -DestinationPath render-selected-markdown.zip -Force; Move-Item render-selected-markdown.zip render-selected-markdown.xpi -Force

For development, use Tools > Developer Tools > Debug Add-ons > Load Temporary Add-on and select manifest.json.
