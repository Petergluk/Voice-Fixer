var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => VoiceFixerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  apiKeys: "",
  model: "gemini-2.5-flash",
  audioBitrate: 32e3,
  autoFallback: true,
  smartRouting: true,
  maxWaitTime: 3,
  debugMode: false,
  promptMode: "default",
  sysPrompt_default: `\u0422\u044B \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u0449\u0438\u043A \u0438 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043E\u0440 \u0442\u0435\u043A\u0441\u0442\u0430. \u0422\u0432\u043E\u044F \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F - \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u043F\u0442 \u0430\u0443\u0434\u0438\u043E\u0444\u0430\u0439\u043B\u043E\u0432, \u0432\u044B\u0447\u0438\u0442\u043A\u0430, \u043E\u0447\u0438\u0441\u0442\u043A\u0430, \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u044F \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043E\u043A \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043D\u043E\u0439 \u0440\u0435\u0447\u0438.

\u0422\u0432\u043E\u0438 \u0437\u0430\u0434\u0430\u0447\u0438:
- \u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043E\u0448\u0438\u0431\u043A\u0438 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F.
- \u0438\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0433\u0440\u0430\u043D\u0438\u0446\u044B \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0439, \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u0443\u044F\u0441\u044C \u043B\u043E\u0433\u0438\u043A\u043E\u0439 \u0442\u0435\u043A\u0441\u0442\u0430.
- \u0438\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043E\u0448\u0438\u0431\u043A\u0438 \u0432 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0438 \u0441\u043B\u043E\u0432, \u044D\u0432\u0440\u0438\u0441\u0442\u0438\u0447\u0435\u0441\u043A\u0438, \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u0443\u044F\u0441\u044C \u043B\u043E\u0433\u0438\u043A\u043E\u0439 \u0442\u0435\u043A\u0441\u0442\u0430.
- \u0438\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043F\u0443\u043D\u043A\u0442\u0443\u0430\u0446\u0438\u044E, \u043E\u0440\u0444\u043E\u0433\u0440\u0430\u0444\u0438\u044E, \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u0442\u044C \u043F\u0430\u0434\u0435\u0436\u0438.
- \u043F\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0432\u043E\u043F\u0440\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0435 \u0437\u043D\u0430\u043A\u0438 (?) \u0432 \u043A\u043E\u043D\u0446\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u0445 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0439
- \u044D\u0432\u0440\u0438\u0441\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043C\u044B\u0441\u043B \u0435\u0441\u043B\u0438 \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430 \u043D\u0438\u0437\u043A\u043E\u0433\u043E \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0430. 
- \u0437\u0430\u043C\u0435\u043D\u0438\u0442\u044C \u0446\u0438\u0444\u0440\u044B \u0441\u043B\u043E\u0432\u0430\u043C\u0438, \u043F\u043E \u0441\u043C\u044B\u0441\u043B\u0443 \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \u0432\u043C\u0435\u0441\u0442\u043E "1" \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C "\u043F\u0435\u0440\u0432\u044B\u0439", "\u043E\u0434\u0438\u043D", "\u043E\u0434\u043D\u043E\u0433\u043E", "\u0440\u0430\u0437" \u0438 \u0442.\u0434. (\u0430 \u0434\u0430\u0442\u044B \u043D\u0430\u043E\u0431\u043E\u0440\u043E\u0442 \u043F\u0435\u0440\u0435\u0432\u0435\u0441\u0442\u0438 \u0432 \u0446\u0438\u0444\u0440\u044B).

\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0441\u043C\u044B\u0441\u043B \u043E\u0442 \u0441\u043B\u043E\u0432\u0435\u0441\u043D\u043E\u0433\u043E \u043C\u0443\u0441\u043E\u0440\u0430 (\u0435\u0441\u043B\u0438 \u043E\u043D \u0435\u0441\u0442\u044C)
* \u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0441\u043B\u043E\u0432\u0430 \u0438 \u043E\u0431\u043E\u0440\u043E\u0442\u044B, \u0438\u0441\u0447\u0435\u0437\u043D\u043E\u0432\u0435\u043D\u0438\u0435 \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u043D\u0438\u043A\u0430\u043A \u043D\u0435 \u043C\u0435\u043D\u044F\u0435\u0442 \u0441\u043C\u044B\u0441\u043B \u0441\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u0433\u043E, \u0442\u0430\u043A\u0438\u0435 \u043A\u0430\u043A: "\u043A\u0430\u043A \u0431\u044B", "\u043D\u0443", "\u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u043E", "\u043A\u0430\u043A\u043E\u0439-\u0442\u043E", "\u043D\u0435\u043A\u0438\u0439" \u0430 \u0442\u0430\u043A\u0436\u0435 \u0438\u0445 \u0441\u043E\u0447\u0435\u0442\u0430\u043D\u0438\u0439.

\u0420\u0430\u0437\u043C\u0435\u0442\u0438\u0442\u044C \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0443 \u0442\u0435\u043A\u0441\u0442\u0430:
* \u0440\u0430\u0437\u0431\u0438\u0442\u044C \u0434\u043B\u0438\u043D\u043D\u044B\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u043D\u0430 \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0435
* \u0440\u0430\u0437\u0431\u0438\u0442\u044C \u0441\u043F\u043B\u043E\u0448\u043D\u043E\u0439 \u0442\u0435\u043A\u0441\u0442 \u043D\u0430 \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0435 \u0430\u0431\u0437\u0430\u0446\u044B, (3-5 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0439) \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0441\u0442\u0432\u0443\u044F\u0441\u044C \u043B\u043E\u0433\u0438\u043A\u043E\u0439 \u0442\u0435\u043A\u0441\u0442\u0430.
* \u0415\u0441\u043B\u0438 \u0432 \u0442\u0435\u043A\u0441\u0442\u0435 \u0431\u043E\u043B\u0435\u0435 5 \u0430\u0431\u0437\u0430\u0446\u0435\u0432 \u0438 \u0435\u0441\u0442\u044C \u043B\u043E\u0433\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0447\u0430\u0441\u0442\u0438 - \u0440\u0430\u0437\u0431\u0438\u0442\u044C \u0442\u0435\u043A\u0441\u0442 \u043D\u0430 \u0441\u043C\u044B\u0441\u043B\u043E\u0432\u044B\u0435 \u0431\u043B\u043E\u043A\u0438 \u0438 \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043A \u043D\u0438\u043C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438 H3.

!IMPORTANT! \u0422\u044B \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0448\u044C \u043F\u043E\u043B\u043D\u043E\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435 \u0438\u0441\u0445\u043E\u0434\u043D\u043E\u0433\u043E \u0442\u0435\u043A\u0441\u0442\u0430, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0434\u0438\u0430\u043B\u043E\u0433\u0438 \u0438 \u0442\u0435\u043A\u0441\u0442\u044B \u0443\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u043C\u044B\u0445 \u043C\u0435\u0434\u0438\u0442\u0430\u0446\u0438\u0439. \u0422\u044B \u043D\u0438\u043A\u043E\u0433\u0434\u0430 \u043D\u0435 \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u0443\u0435\u0448\u044C \u0438 \u043D\u0435 \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u0438\u0440\u0443\u0435\u0448\u044C \u0441\u043C\u044B\u0441\u043B\u044B, \u043B\u0438\u0448\u044C \u0441\u043B\u0435\u0433\u043A\u0430 \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0438\u0440\u0443\u0435\u0448\u044C \u0438\u0445 \u0438\u0437\u043B\u043E\u0436\u0435\u043D\u0438\u0435.
!IMPORTANT! \u041F\u0440\u0438 \u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0430\u0446\u0438\u0438 \u0442\u0435\u043A\u0441\u0442\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0439 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u0442\u043E\u043D \u0438 \u0441\u0442\u0438\u043B\u044C.

\u0412\u044B\u0432\u0435\u0434\u0438 \u0422\u041E\u041B\u042C\u041A\u041E \u043A\u043E\u043D\u0435\u0447\u043D\u044B\u0439 \u0447\u0438\u0441\u0442\u044B\u0439 \u0442\u0435\u043A\u0441\u0442. \u041D\u0438\u043A\u0430\u043A\u0438\u0445 \u043F\u0440\u0435\u0444\u0438\u043A\u0441\u043E\u0432 \u0432\u0440\u043E\u0434\u0435 "\u0412\u043E\u0442 \u0442\u0435\u043A\u0441\u0442:" \u043D\u0435 \u043D\u0443\u0436\u043D\u043E.`,
  sysPrompt_concise: `\u0422\u044B \u0418\u0418-\u0440\u0435\u0434\u0430\u043A\u0442\u043E\u0440. \u0422\u0432\u043E\u044F \u0437\u0430\u0434\u0430\u0447\u0430 \u2014 \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0438\u0437 \u0441\u0443\u043C\u0431\u0443\u0440\u043D\u043E\u0439 \u0443\u0441\u0442\u043D\u043E\u0439 \u0440\u0435\u0447\u0438 \u0447\u0435\u0442\u043A\u0438\u0439, \u043B\u0430\u043A\u043E\u043D\u0438\u0447\u043D\u044B\u0439 \u0438 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442.

\u0417\u0430\u0434\u0430\u0447\u0438:
- \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u0442\u0435\u043A\u0441\u0442 \u043E\u0442 \u0432\u043E\u0434\u044B, \u0431\u0435\u0441\u0441\u043C\u044B\u0441\u043B\u0435\u043D\u043D\u044B\u0445 \u043F\u043E\u0432\u0442\u043E\u0440\u043E\u0432 \u0438 \u0441\u043B\u043E\u0432-\u043F\u0430\u0440\u0430\u0437\u0438\u0442\u043E\u0432.
- \u0418\u0437\u0432\u043B\u0435\u0447\u044C \u0433\u043B\u0430\u0432\u043D\u0443\u044E \u043C\u044B\u0441\u043B\u044C \u0438 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0444\u0430\u043A\u0442\u044B.
- \u041F\u0435\u0440\u0435\u043F\u0438\u0441\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u043D\u043E, \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E \u043B\u0430\u043A\u043E\u043D\u0438\u0447\u043D\u043E, \u043F\u043E \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443.
- \u0420\u0430\u0437\u0431\u0438\u0442\u044C \u043D\u0430 \u043B\u043E\u0433\u0438\u0447\u043D\u044B\u0435 \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0435 \u0430\u0431\u0437\u0430\u0446\u044B \u0438\u043B\u0438 \u043F\u0443\u043D\u043A\u0442\u044B.
- \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043E\u0431\u0449\u0443\u044E \u0441\u0443\u0442\u044C, \u043D\u043E \u0441\u043E\u043A\u0440\u0430\u0442\u0438\u0442\u044C \u043E\u0431\u044A\u0435\u043C \u0431\u0435\u0437 \u043F\u043E\u0442\u0435\u0440\u0438 \u0432\u0430\u0436\u043D\u044B\u0445 \u0434\u0435\u0442\u0430\u043B\u0435\u0439.

\u0412\u044B\u0432\u0435\u0434\u0438 \u0422\u041E\u041B\u042C\u041A\u041E \u0433\u043E\u0442\u043E\u0432\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 \u0431\u0435\u0437 \u043F\u0440\u0435\u0434\u0438\u0441\u043B\u043E\u0432\u0438\u0439.`
};
var VoiceFixerSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Settings for Voice Fixer" });
    new import_obsidian.Setting(containerEl).setName("Gemini API Keys").setDesc("Your Google Gemini API Keys (comma or line separated). Providing multiple keys helps avoid rate limits.").addTextArea((text) => {
      text.setPlaceholder("Enter your API keys").setValue(this.plugin.settings.apiKeys).onChange(async (value) => {
        this.plugin.settings.apiKeys = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.rows = 4;
      text.inputEl.cols = 50;
    });
    new import_obsidian.Setting(containerEl).setName("Model").setDesc("Gemini model to use first").addDropdown((dropdown) => dropdown.addOption("gemini-3.5-flash", "Gemini 3.5 Flash").addOption("gemini-3-flash-preview", "Gemini 3 Flash Preview").addOption("gemini-2.5-flash", "Gemini 2.5 Flash").addOption("gemini-3.1-flash-lite", "Gemini 3.1 Flash Lite").setValue(this.plugin.settings.model).onChange(async (value) => {
      this.plugin.settings.model = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Audio Bitrate (kbps)").setDesc("Audio compression quality. Lower is smaller (fits more in 20MB limit).").addDropdown((dropdown) => dropdown.addOption("16000", "16 kbps").addOption("32000", "32 kbps").addOption("64000", "64 kbps").addOption("128000", "128 kbps").setValue(this.plugin.settings.audioBitrate.toString()).onChange(async (value) => {
      this.plugin.settings.audioBitrate = parseInt(value, 10);
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Auto Fallback").setDesc("Automatically try other models/keys if the first one fails due to rate limits.").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoFallback).onChange(async (value) => {
      this.plugin.settings.autoFallback = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Smart Model Routing").setDesc("Dynamically measure response times and use the fastest available model.").addToggle((toggle) => toggle.setValue(this.plugin.settings.smartRouting).onChange(async (value) => {
      this.plugin.settings.smartRouting = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Max Wait Time (minutes)").setDesc("Maximum time to wait for AI response before aborting or trying next model.").addText((text) => text.setPlaceholder("3").setValue(this.plugin.settings.maxWaitTime.toString()).onChange(async (value) => {
      this.plugin.settings.maxWaitTime = parseInt(value, 10) || 3;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Debug Logging").setDesc("Enable debug logs (for troubleshooting)").addToggle((toggle) => toggle.setValue(this.plugin.settings.debugMode).onChange(async (value) => {
      this.plugin.settings.debugMode = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Prompt Mode").setDesc("Select the transcription style").addDropdown((dropdown) => dropdown.addOption("default", "Exact Transcription (\u0422\u043E\u0447\u043D\u0430\u044F \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430)").addOption("concise", "Concise Summary (\u041A\u0440\u0430\u0442\u043A\u0430\u044F \u0432\u044B\u0436\u0438\u043C\u043A\u0430)").setValue(this.plugin.settings.promptMode).onChange(async (value) => {
      this.plugin.settings.promptMode = value;
      await this.plugin.saveSettings();
      this.display();
    }));
    const isConcise = this.plugin.settings.promptMode === "concise";
    new import_obsidian.Setting(containerEl).setName("System Prompt").setDesc(`Instructions for the AI (${isConcise ? "Concise Summary" : "Exact Transcription"})`).addTextArea((text) => {
      text.setPlaceholder("Enter system prompt").setValue(isConcise ? this.plugin.settings.sysPrompt_concise : this.plugin.settings.sysPrompt_default).onChange(async (value) => {
        if (isConcise) {
          this.plugin.settings.sysPrompt_concise = value;
        } else {
          this.plugin.settings.sysPrompt_default = value;
        }
        await this.plugin.saveSettings();
      });
      text.inputEl.rows = 15;
      text.inputEl.cols = 50;
    });
  }
};

// src/audioRecorder.ts
var AudioRecorder = class {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.onAudioLevelUpdate = null;
    this.animationFrameId = null;
  }
  setAudioLevelCallback(callback) {
    this.onAudioLevelUpdate = callback;
  }
  async startRecording(bitrate = 32e3) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      let options = { mimeType: "audio/webm" };
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options = { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: bitrate };
      } else {
        options = { mimeType: "audio/webm", audioBitsPerSecond: bitrate };
      }
      this.mediaRecorder = new MediaRecorder(stream, options);
      this.audioChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      this.mediaRecorder.start();
      const updateLevel = () => {
        var _a;
        if (this.analyser && this.dataArray && this.onAudioLevelUpdate) {
          this.analyser.getByteFrequencyData(this.dataArray);
          let sum = 0;
          for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
          }
          const average = sum / this.dataArray.length;
          this.onAudioLevelUpdate(average);
        }
        if (((_a = this.mediaRecorder) == null ? void 0 : _a.state) === "recording") {
          this.animationFrameId = requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      throw error;
    }
  }
  stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error("No recording in progress"));
      }
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      this.mediaRecorder.onstop = async () => {
        var _a;
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        const base64 = await this.blobToBase64(audioBlob);
        (_a = this.mediaRecorder) == null ? void 0 : _a.stream.getTracks().forEach((track) => track.stop());
        this.mediaRecorder = null;
        if (this.audioContext) {
          await this.audioContext.close();
          this.audioContext = null;
          this.analyser = null;
          this.dataArray = null;
        }
        resolve(base64);
      };
      this.mediaRecorder.stop();
    });
  }
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  isRecording() {
    return this.mediaRecorder !== null && this.mediaRecorder.state === "recording";
  }
};

// src/recordingModal.ts
var import_obsidian2 = require("obsidian");
var RecordingModal = class extends import_obsidian2.Modal {
  constructor(app, plugin) {
    super(app);
    this.isRecording = false;
    this.timerInterval = null;
    this.startTime = 0;
    this.visualizerBars = [];
    this.plugin = plugin;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass("vf-recording-modal");
    this.modalEl.style.padding = "0";
    this.modalEl.style.width = "fit-content";
    this.modalEl.style.borderRadius = "24px";
    this.modalEl.style.boxShadow = "0 10px 40px rgba(0,0,0,0.15)";
    this.modalEl.style.border = "1px solid var(--background-modifier-border)";
    contentEl.style.padding = "12px 16px";
    contentEl.style.margin = "0";
    this.mainContainer = contentEl.createEl("div");
    this.mainContainer.style.display = "flex";
    this.mainContainer.style.alignItems = "center";
    this.mainContainer.style.gap = "16px";
    const dot = this.mainContainer.createEl("div");
    dot.style.width = "12px";
    dot.style.height = "12px";
    dot.style.borderRadius = "50%";
    dot.style.backgroundColor = "#ff4d4d";
    dot.style.animation = "vf-pulse 1.5s infinite";
    this.timeDisplay = this.mainContainer.createEl("div", { text: "00:00" });
    this.timeDisplay.style.fontSize = "1.3rem";
    this.timeDisplay.style.fontWeight = "600";
    this.timeDisplay.style.fontFamily = "monospace";
    const visualizer = this.mainContainer.createEl("div");
    visualizer.style.display = "flex";
    visualizer.style.alignItems = "center";
    visualizer.style.gap = "4px";
    visualizer.style.height = "24px";
    for (let i = 0; i < 5; i++) {
      const bar = visualizer.createEl("div");
      bar.style.width = "6px";
      bar.style.height = "4px";
      bar.style.borderRadius = "3px";
      bar.style.backgroundColor = "#ff4d4d";
      bar.style.transition = "height 0.1s ease";
      this.visualizerBars.push(bar);
    }
    const separator = this.mainContainer.createEl("div");
    separator.style.width = "1px";
    separator.style.height = "24px";
    separator.style.backgroundColor = "var(--background-modifier-border)";
    separator.style.margin = "0 4px";
    const stopBtn = this.mainContainer.createEl("button");
    stopBtn.style.display = "flex";
    stopBtn.style.alignItems = "center";
    stopBtn.style.gap = "10px";
    stopBtn.style.backgroundColor = "var(--text-normal)";
    stopBtn.style.color = "var(--background-primary)";
    stopBtn.style.borderRadius = "16px";
    stopBtn.style.padding = "10px 20px";
    stopBtn.style.border = "none";
    stopBtn.style.fontSize = "1rem";
    stopBtn.style.fontWeight = "600";
    stopBtn.style.cursor = "pointer";
    const squareIcon = stopBtn.createEl("div");
    squareIcon.style.width = "12px";
    squareIcon.style.height = "12px";
    squareIcon.style.backgroundColor = "var(--background-primary)";
    squareIcon.style.borderRadius = "2px";
    stopBtn.createEl("span", { text: "\u0413\u043E\u0442\u043E\u0432\u043E" });
    const cancelBtn = this.mainContainer.createEl("button");
    cancelBtn.style.display = "flex";
    cancelBtn.style.alignItems = "center";
    cancelBtn.style.justifyContent = "center";
    cancelBtn.style.width = "42px";
    cancelBtn.style.height = "42px";
    cancelBtn.style.borderRadius = "16px";
    cancelBtn.style.backgroundColor = "var(--background-secondary-alt)";
    cancelBtn.style.color = "var(--text-normal)";
    cancelBtn.style.border = "none";
    cancelBtn.style.cursor = "pointer";
    cancelBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    if (!document.getElementById("vf-modal-styles")) {
      const style = document.createElement("style");
      style.id = "vf-modal-styles";
      style.textContent = `
                @keyframes vf-pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.8); }
                    100% { opacity: 1; transform: scale(1); }
                }
                .vf-recording-modal .modal-close-button {
                    display: none;
                }
                .vf-recording-modal.modal {
                    background-color: var(--background-primary);
                }
            `;
      document.head.appendChild(style);
    }
    stopBtn.addEventListener("click", async () => {
      await this.stopAndTranscribe();
    });
    cancelBtn.addEventListener("click", async () => {
      await this.cancelRecording();
    });
    this.plugin.recorder.setAudioLevelCallback((level) => {
      const maxHeights = [14, 20, 24, 20, 14];
      for (let i = 0; i < this.visualizerBars.length; i++) {
        const normalized = Math.min(1, Math.max(0, (level - 20) / 80));
        const randomScale = 0.5 + Math.random() * 0.5;
        const targetHeight = 4 + (maxHeights[i] - 4) * normalized * randomScale;
        this.visualizerBars[i].style.height = `${targetHeight}px`;
      }
    });
    this.startRecording();
  }
  onClose() {
    if (this.isRecording) {
      this.cancelRecording();
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.plugin.recorder.setAudioLevelCallback(null);
    const { contentEl } = this;
    contentEl.empty();
  }
  async startRecording() {
    try {
      await this.plugin.recorder.startRecording(this.plugin.settings.audioBitrate);
      this.isRecording = true;
      this.startTime = Date.now();
      this.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1e3);
        const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
        const secs = (elapsed % 60).toString().padStart(2, "0");
        this.timeDisplay.setText(`${mins}:${secs}`);
      }, 1e3);
    } catch (err) {
      new import_obsidian2.Notice("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043D\u0430\u0447\u0430\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D\u0430.");
      this.close();
    }
  }
  async stopAndTranscribe() {
    if (!this.isRecording) return;
    this.isRecording = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.plugin.recorder.setAudioLevelCallback(null);
    try {
      const base64Audio = await this.plugin.recorder.stopRecording();
      this.close();
      this.plugin.processAudioBackground(base64Audio);
    } catch (error) {
      new import_obsidian2.Notice(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u043F\u0438\u0441\u0438: ${error.message}`);
      console.error(error);
      this.close();
    }
  }
  async cancelRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.plugin.recorder.setAudioLevelCallback(null);
    try {
      await this.plugin.recorder.stopRecording();
    } catch (e) {
    }
    new import_obsidian2.Notice("\u0417\u0430\u043F\u0438\u0441\u044C \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u0430.");
    this.close();
  }
};

// src/geminiApi.ts
var import_obsidian3 = require("obsidian");
async function processAudioWithGemini(settings, base64Audio) {
  var _a, _b, _c, _d, _e;
  const keys = settings.apiKeys.split(/[\n,]+/).map((k) => k.trim()).filter((k) => k.length > 0);
  if (keys.length === 0) {
    throw new Error("API key is missing. Please set it in the plugin settings.");
  }
  let models = [settings.model];
  if (settings.autoFallback) {
    const DEFAULT_MODELS = ["gemini-3.5-flash", "gemini-3-flash-preview", "gemini-2.5-flash", "gemini-3.1-flash-lite"];
    models = [settings.model, ...DEFAULT_MODELS.filter((m) => m !== settings.model)];
  }
  const systemPrompt = settings.promptMode === "concise" ? settings.sysPrompt_concise : settings.sysPrompt_default;
  let lastError = null;
  for (const model of models) {
    for (const apiKey of keys) {
      try {
        if (settings.debugMode) console.log(`[Voice Fixer] Trying model ${model} with key starting with ${apiKey.substring(0, 5)}...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload = {
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{
            parts: [
              { inline_data: { mime_type: "audio/webm", data: base64Audio } },
              { text: "Please transcribe and correct this audio according to the system instructions." }
            ]
          }]
        };
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Request timed out after ${settings.maxWaitTime} minutes.`));
          }, settings.maxWaitTime * 60 * 1e3);
        });
        const requestPromise = (0, import_obsidian3.requestUrl)({
          url,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const response = await Promise.race([requestPromise, timeoutPromise]);
        if (response.status !== 200) {
          const errText = response.text || JSON.stringify(response.json);
          if (response.status === 429 && settings.autoFallback) {
            if (settings.debugMode) console.warn(`[Voice Fixer] Rate limit (429) on ${model}`);
            lastError = new Error(`Rate limit on ${model}`);
            continue;
          }
          throw new Error(`API Error ${response.status}: ${errText}`);
        }
        const data = response.json;
        const text = (_e = (_d = (_c = (_b = (_a = data.candidates) == null ? void 0 : _a[0]) == null ? void 0 : _b.content) == null ? void 0 : _c.parts) == null ? void 0 : _d[0]) == null ? void 0 : _e.text;
        if (text) {
          if (settings.debugMode) console.log(`[Voice Fixer] Success with model ${model}`);
          return text;
        }
        throw new Error("No transcription generated in the response.");
      } catch (err) {
        if (settings.debugMode) console.error(`[Voice Fixer] Error with model ${model} / key ${apiKey.substring(0, 5)}:`, err);
        lastError = err;
        if (!settings.autoFallback) {
          throw err;
        }
      }
    }
  }
  throw new Error(`All attempts failed. Last error: ${(lastError == null ? void 0 : lastError.message) || "Unknown error"}`);
}

// src/main.ts
var VoiceFixerPlugin = class extends import_obsidian4.Plugin {
  async onload() {
    await this.loadSettings();
    this.recorder = new AudioRecorder();
    this.addSettingTab(new VoiceFixerSettingTab(this.app, this));
    this.addRibbonIcon("microphone", "Voice Fixer: Start Recording", () => {
      this.startRecordingProcess();
    });
    this.addCommand({
      id: "start-recording-modal",
      name: "Start Recording (Open Modal)",
      callback: () => {
        this.startRecordingProcess();
      }
    });
    this.addCommand({
      id: "fix-selected-text",
      name: "Fix Selected Text",
      editorCallback: async (editor) => {
        const selection = editor.getSelection();
        if (!selection) {
          new import_obsidian4.Notice("No text selected");
          return;
        }
        new import_obsidian4.Notice("Text correction only is coming soon! Use the mic for now.");
      }
    });
  }
  startRecordingProcess() {
    if (!this.settings.apiKeys) {
      new import_obsidian4.Notice("Please set your Gemini API Keys in the settings first!");
      return;
    }
    if (this.recorder.isRecording()) {
      new import_obsidian4.Notice("Already recording!");
      return;
    }
    new RecordingModal(this.app, this).open();
  }
  async processAudioBackground(base64Audio) {
    new import_obsidian4.Notice("\u0410\u0443\u0434\u0438\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u043D\u0430 \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0443...");
    const statusBarItem = this.addStatusBarItem();
    statusBarItem.setText("\u23F3 Voice Fixer: Transcribing...");
    try {
      const result = await processAudioWithGemini(this.settings, base64Audio);
      try {
        await navigator.clipboard.writeText(result);
        new import_obsidian4.Notice("\u0422\u0435\u043A\u0441\u0442 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D \u0432 \u0431\u0443\u0444\u0435\u0440 (\u0440\u0435\u0437\u0435\u0440\u0432\u043D\u0430\u044F \u043A\u043E\u043F\u0438\u044F).");
      } catch (e) {
        console.warn("Could not write to clipboard", e);
      }
      this.insertText(result);
      new import_obsidian4.Notice("\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0430 \u0438 \u0432\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u0430!");
    } catch (error) {
      new import_obsidian4.Notice(`\u041E\u0448\u0438\u0431\u043A\u0430: ${error.message}`);
      console.error(error);
    } finally {
      statusBarItem.remove();
    }
  }
  insertText(text) {
    const activeView = this.app.workspace.getActiveViewOfType(import_obsidian4.MarkdownView);
    if (activeView) {
      const editor = activeView.editor;
      const cursor = editor.getCursor();
      const line = editor.getLine(cursor.line);
      const prefix = line.length > 0 && cursor.ch > 0 ? "\n\n" : "";
      const textToInsert = prefix + text + "\n\n";
      editor.replaceRange(textToInsert, cursor);
      const newCursor = editor.offsetToPos(editor.posToOffset(cursor) + textToInsert.length);
      editor.setCursor(newCursor);
    } else {
      new import_obsidian4.Notice("No active file to insert text. Transcribed text is in your clipboard!");
    }
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
