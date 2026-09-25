# rich-text-editor-plugin

Code for the [Rich Text Editor Component Plugin](https://community.appian.com/b/appmarket/posts/rich-text-editor) and [Rich Text Editor Image Upload Connected System Plugin](https://community.appian.com/b/appmarket/posts/rich-text-editor-image-upload-connected-system).

For information on how to use this plugin, see the [End-User Rich Text Editor Component Documentation](https://community.appian.com/w/the-appian-playbook/1378/end-user-rich-text-editor-component).

If you are having trouble with the plugin, see the [Rich Text Editor Component Plug-in Troubleshooting Guide](https://community.appian.com/w/the-appian-playbook/1603/rich-text-editor-component-plug-in-troubleshooting-guide)

## Disclaimer 
This plug-in is provided on an "AS IS" BASIS WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND.  Please see the [License](LICENSE) for the full license.  

Do not open an Appian Support ticket for problems related to this or any plug-in.  Instead, engage with us using the chat feature in the above App Market listings or create a [Github Issue](https://github.com/appian/rich-text-editor-plugin/issues).

## Owners
Dan Tobias and Jed Fonner

---

## About this fork

This fork ([patel-akshar/rich-text-editor-plugin-akshar](https://github.com/patel-akshar/rich-text-editor-plugin-akshar))
carries paste-handling fixes for the Summernote component
(`cp/richTextFieldWithTables/v1/index.js`) plus a fork-only browser test suite.
See [e2e-tests/README.md](e2e-tests/README.md) for the suite and the full
contribution workflow.

**Plugin changes vs upstream** (all in `index.js`, covered by unit + browser tests):

- Pastes containing external images no longer drop the entire paste
- Multi-line plain-text pastes (PDF viewers, editors, terminals) keep their line breaks
- Web-page pastes no longer lose every block after the first (whitespace-node handling)
- Word source newlines no longer become phantom line breaks; Word/Excel unquoted
  attributes now face the sanitizer's allowlist
- `<script>`/`<style>`-style tags are stripped **with their contents**; dead
  `file:///` image references are dropped at paste time
- Blank-paragraph cleanup around pastes (Enter-then-paste, repeated pastes)

**Branch model:**

| Branch | Contents | Purpose |
|---|---|---|
| `master` | everything: plugin fixes + `e2e-tests/` + fork CI | daily work, never used for upstream PRs |
| `paste-handling-fixes` | plugin fixes only, on top of `upstream/master` | the upstream PR branch — contains no fork-only files |

**Testing:** upstream's Jest suite (extended to 235 tests) runs via `ci.yml`;
the fork adds a 60-case Playwright suite executed on Chromium, Firefox and
WebKit via `.github/workflows/e2e.yml`, with an HTML + PDF report generated on
every run.
