browser.composeScripts.register({
  js: [{ file: "highlight.min.js" }, { file: "compose.js" }]
});

async function notify(message) {
  try {
    await browser.notifications.create({
      type: "basic",
      title: "Render Selected Markdown",
      message
    });
  } catch (error) {
    console.error("Render Selected Markdown:", message, error);
  }
}

const MENU_ID = "render-markdown";

browser.menus.create({
  id: MENU_ID,
  title: "Render Markdown",
  icons: { 16: "icon.svg" },
  contexts: ["compose_body"],
  visible: false
});

const LANGS_ID = "markdown-languages";

browser.menus.create({
  id: LANGS_ID,
  title: "Markdown code languages",
  contexts: ["compose_body"]
});

browser.menus.onShown.addListener((info) => {
  browser.menus.update(MENU_ID, { visible: !!info.selectionText });
  browser.menus.refresh();
});

browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID) renderSelection(tab);
  if (info.menuItemId === LANGS_ID) {
    browser.windows.create({
      url: browser.runtime.getURL("supported-languages.html"),
      type: "popup",
      width: 560,
      height: 640
    });
  }
});

browser.composeAction.onClicked.addListener(renderSelection);

async function renderSelection(tab) {
  try {
    const result = await browser.tabs.sendMessage(tab.id, {
      command: "render-selected-markdown"
    });

    if (!result || !result.ok) {
      await notify(result?.error || "Could not render the selected Markdown.");
    }
  } catch (error) {
    console.error("Render Selected Markdown:", error);
    await notify("Could not reach the compose editor. Close and reopen this compose window, then try again.");
  }
}
