'use strict';

import { getCookie, setCookie } from "../../modules/cookies.mjs";
import { max_title_length } from "../../modules/max_lengths.mjs";
import { showNewUserModal } from "../../modules/new-user-modal.mjs";
import CHECKBOX_IDS from "../../modules/checkbox_ids.mjs";
import getDate from "../../modules/date.mjs";

const parameters = new URLSearchParams(window.location.search);

// make sure user has an account
if (!getCookie("nmd-validation")) {
  const _document_uuid = parameters.get("id");
  if (!_document_uuid) {
    window.location.href = "/account/login/?redirect=new_document";
  } else {
    window.location.href = "/account/login/?redirect=document&id=" + _document_uuid;
  }
}

let BOLD_COLOR = "255, 105, 180"; // #FF69B4 - pink
let LINE_NUMBERS_ENABLED;

const isUrl = string => {
  try { return Boolean(new URL(string)); }
  catch(e) { return false }
}

function get_footnote_ids() {
  const footnotes = [...new Set(notepad.value.match(/\[\^(\d{1,5})\]/g))];
  if (!footnotes) return [];
  return footnotes.map(x => x.match(/\d{1,5}/)[0]);
}

function get_footnote_count() {
  const footnotes_ = {};
  const footnotes = notepad.value.match(/\[\^(\d{1,5})\]/g);
  footnotes?.forEach((footnote, i) => {
    footnotes_[footnote] = (footnotes_[footnote] || 0) + 1;
    if (footnotes_[footnote] > 2) footnotes_[footnote] = 2;
  })
  const sumValues = obj => Object.values(obj).reduce((a, b) => a + b);
  if (!footnotes) return 0;
  return Math.ceil(sumValues(footnotes_) / 2);
}

const notepad = document.getElementById("notepad");
const doc = document.getElementById("document");

// get the document uuid
const document_uuid = parameters.get('id');
if (!document_uuid) window.location.href = "/account/me/documents/?error=missing_id&id=" + document_uuid;

let previousHTML = "";
let previousText = "";

const email = JSON.parse(getCookie("nmd-validation")).email.replace(/\./g, ",");

let documentData = {
  title: "Untitled Document",
  owner: null,
  content: "",
  last_visit: Date.now(),
  created: null,
  description: "",
  type: "markdown",
  visibility: "public",
  language: "en",
  theme: "default",
  font: "comfortaa",
  fontSize: 16,
  indentSize: 8,
  authors: [ null ]
};

async function saveSettings(update_line_numbers_enabled = true) {
  showSpinner();
  setSaveStatus('saving');
  if (update_line_numbers_enabled) {
    await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/configurations/${document_uuid}/line_numbers.json`, {
      method: 'PUT',
      body: JSON.stringify(LINE_NUMBERS_ENABLED)
    }).then(res => res.json());
  }
  await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}.json`, {
    method: 'PUT',
    body: JSON.stringify(documentData)
  }).then(() => { hideSpinner(); setSaveStatus('saved'); });
}

async function addBoldEventListeners() {
  document.querySelectorAll("#document b").forEach(b => {
    b.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      b.id = uuid4();
      new BootstrapMenu(`#${b.id}`, {
        actions: [{
          name: "Change Color",
          onClick: () => {
            // select current element
            const eles = document.querySelectorAll(".circle-picker > span");
            eles.forEach(ele => {
              // find ele
              const child = ele.childNodes[0].childNodes[0].childNodes[0];
              if (child.style.boxShadow.includes(`rgb(${BOLD_COLOR})`)) {
                child.click();
              }
            });
            new bootstrap.Modal(document.getElementById("change-bold-text-color-modal")).show();
          }
        }]
      });
    });
  });
}

let NOTEPAD_DISABLED = false;

const langs = {
  "py": "python",
  "js": "javascript",
  "ts": "typescript",
  "json": "json",
  "html": "html",
  "css": "css",
  "cs": "csharp",
  "cpp": "cpp",
  "c": "c",
  "en": "english",
  "sp": "spanish",
  "fr": "french"
};

const fonts = {
  "comfortaa": "Comfortaa",
  "calibri": "Calibri",
  "roboto": "Roboto",
  "helvetica": "Helvetica",
  "times-new-roman": "Times New Roman",
  "montserrat": "Montserrat",
  "source-code-pro": "Source Code Pro",
  "arial": "Arial",
  "open-sans": "Open Sans",
  "consolas": "Consolas",
  "fira-code": "Fira Code",
  "jetbrains-mono": "JetBrains Mono",
  "josefin-sans": "Josefin Sans"
};

// get the document content
fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}.json`, {
  method: "GET",
}).then(r => r.json()).then(_doc => {
  if (!_doc) window.location.href = "/account/me/documents/?error=invalid_id";
  
  documentData.title = _doc?.title || documentData.title;
  documentData.owner = _doc?.owner || documentData.owner;
  documentData.content = _doc?.content || documentData.content;
  documentData.last_visit = Date.now();
  documentData.created = _doc?.created || documentData.created;
  documentData.description = _doc?.description || documentData.description;
  documentData.type = _doc?.type || documentData.type;
  documentData.visibility = _doc?.visibility || documentData.visibility;
  documentData.language = _doc?.language || documentData.language;
  documentData.theme = _doc?.theme || documentData.theme;
  documentData.font = _doc?.font || documentData.font;
  documentData.fontSize = _doc?.fontSize || documentData.fontSize;
  documentData.indentSize = _doc?.indentSize || documentData.indentSize;
  documentData.authors = _doc?.authors || [ email.replace(/,/g, ".") ];
  documentData.authors = documentData.authors.map(author => author.replace(/,/g, "."));

  // only document authors can access the edit page
  if (!documentData.authors.includes(email.replace(/,/g, "."))) {
    if (_doc.visibility === "public") {
      window.location.href = "/document/view/?id=" + document_uuid;
    } else {
      window.location.href = "/account/me/documents/?error=private_document";
    }
    return;
  }

  if (documentData.type === "code") {
    document.getElementById(`theme-${documentData.theme}`).disabled = false;
    const lang = langs[documentData.language];
    let _doc_lang = _doc.content.match(/<code class="language-(.*?)">/g);
    if (_doc_lang) {
      _doc_lang = _doc_lang[0].substring(23, _doc_lang[0].length - 2);
      if (lang !== _doc_lang) {
        documentData.content = documentData.content.replace(/<code class="language-(.*?)">/g, `<code class="language-${lang}">`);
        // upload to firebase
        saveSettings(false);
      }
    }
    
    // add "line-numbers" toggle switch to settings menu
    document.getElementById("line-numbers-toggle").style.display = "block";
  }

  // disable autocomplete
  if (documentData.type === "code" || documentData.language !== "en") {
    notepad.setAttribute("spellcheck", "false");
  } else {
    notepad.setAttribute("spellcheck", "true");
  }

  notepad.style.fontSize = documentData.fontSize + 'px';
  notepad.style.tabSize = documentData.indentSize;
  notepad.style.fontFamily = fonts[documentData.font];

  // add font to document, has to be done through style tag to get all children of #document
  let style = document.createElement("style");
  style.innerHTML = `#document *, #document { font-family: "${fonts[documentData.font]}"!important; }`;
  document.head.appendChild(style);
  
  if (documentData.type !== "code") {
    doc.style.fontSize = documentData.fontSize + 'px';
  }

  notepad.value = previousText = _doc.content || "";
  previousHTML = compileMarkdown(_doc.content) || "";
  
  // if (documentData.type === "code" && previousHTML) {
  //   previousHTML = previousHTML.substring(0, 39) + previousHTML.substring(40, previousHTML.length);
  // }

  doc.innerHTML = `${documentData.type === "markdown" ? '<div id="footnotes-alert-placeholder"></div>' : ''}</div>${previousHTML}`;
  hljs.highlightAll();

  // update checkbox ids and add event listeners
  (async () => {
    let checkboxes = Array.from(doc.querySelectorAll("input[type='checkbox']"));
    if (checkboxes.length) {
      checkboxes.forEach((checkbox, i) => {
        checkbox.id = CHECKBOX_IDS[i];

        checkbox.addEventListener("change", (event) => {
          updateCheckbox(email, event.target.id, event.target.checked);
        });
      });
    }
  })();

  if (documentData.type !== "markdown") {
    document.getElementById("footnotes-alert-placeholder")?.remove();
  }

  (async () => {
    LINE_NUMBERS_ENABLED = await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/configurations/${document_uuid}/line_numbers.json`, { method: 'GET' }).then(res => res.json()) || false;
    if (LINE_NUMBERS_ENABLED) {
      document.getElementById("line-numbers-switch").checked = true;
      hljs.initLineNumbersOnLoad();
    } else {
      document.getElementById("line-numbers-switch").checked = false;
    }
  })();

  // fill in checkboxes
  (async () => {
    let checkboxes = Array.from(doc.querySelectorAll("input[type='checkbox']"));
    if (checkboxes.length) {
      const checkbox_data = await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/checkboxes/${document_uuid}/${email}.json`, { method: 'GET' }).then(r => r.json());
      checkboxes.forEach((checkbox) => {
        checkbox.checked = checkbox_data[checkbox.id] === 1 ? true : false;
        checkbox.addEventListener("change", (event) => {
          updateCheckbox(email, event.target.id, event.target.checked);
        });
        // enter event listener
        checkbox.addEventListener("keydown", (event) => {
          if (event.code === "Enter") {
            checkbox.click();
          }
        });
      });
    }
  })();

  // set color of bold items
  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/configurations/${document_uuid}/${JSON.parse(getCookie('nmd-validation')).email.replace(/\./g, ",")}/bold_color.json`, { 
    method: 'GET'
  }).then(res => res.json()).then(d => {
    BOLD_COLOR = d || "255, 105, 180";
    const _e_ = document.createElement("style");
    _e_.innerHTML = d.startsWith('#') ? `b { color: ${d}; }` : `b { color: rgb(${d}); }`;
    document.body.appendChild(_e_);
  }).catch(() => {
    // set the default color
    const _e_ = document.createElement("style");
    _e_.innerHTML = "b { color: #FF69B4; }";
    document.body.appendChild(_e_);
  });

  documentData.title = _doc.title;
  const title_ele = document.querySelector("document-title");
  title_ele.innerText = documentData.title;
  title_ele.style.color = (title_ele.innerText === "Untitled Document") ? "tomato" : "var(--nmd-blue)";
  document.title = documentData.title;
  notepad.setSelectionRange(0, 0);

  // check for new user
  if (JSON.parse(getCookie("nmd-validation")).created_on === getDate() && !sessionStorage.getItem("new-user-modal-shown")) {
    showNewUserModal();
    sessionStorage.setItem("new-user-modal-shown", true);
  }

  // add bold contextmenu event listeners
  addBoldEventListeners();
}).then(() => {
  // show run code button if in code mode & language is set to javascript
  if (documentData.type === "code" && documentData.language === "js") {
    document.getElementById("run-code-btn").classList.remove("visually-hidden");
  }

  if (documentData.type === "markdown") {
    document.getElementById("italics").addEventListener("click", () => {
      const sel = window.getSelection().toString();
      if (sel.length === 0) {
        insertText("**", -1);
      } else if (notepad.value.includes(sel)) {
        insertText(`*${sel}*`, 0);
      }
      notepad.focus();
    });
  
    document.getElementById("bold").addEventListener("click", () => {
      const sel = window.getSelection().toString();
      if (sel.length === 0) {
        insertText("****", -2);
      } else if (notepad.value.includes(sel)) {
        insertText(`**${sel}**`, 0);
      }
      notepad.focus();
    });
  
    document.getElementById("underline").addEventListener("click", () => {
      const sel = window.getSelection().toString();
      if (sel.length === 0) {
        insertText("____", -2);
      } else if (notepad.value.includes(sel)) {
        insertText(`__${sel}__`, 0);
      }
      notepad.focus();
    });
  
    document.getElementById("strikethrough").addEventListener("click", () => {
      const sel = window.getSelection().toString();
      if (sel.length === 0) {
        insertText("~~~~", -2);
      } else if (notepad.value.includes(sel)) {
        insertText(`~~${sel}~~`, 0);
      }
      notepad.focus();
    });
  
    document.getElementById("highlight").addEventListener("click", () => {
      const sel = window.getSelection().toString();
      if (sel.length === 0) {
        insertText("``", -1);
      } else if (notepad.value.includes(sel)) {
        insertText(`\`${sel}\``, 0);
      }
      notepad.focus();
    });
  
    document.getElementById("link").addEventListener("click", () => {
      const sel = window.getSelection().toString();
      if (sel.length === 0) {
        insertText("[]()", -3);
      } else if (notepad.value.includes(sel)) {
        if (isUrl(sel)) {
          insertText(`[](${sel})`, 0 - (3 + sel.length));
        } else {
          insertText(`[${sel}]()`, -1);
        }
      }
      notepad.focus();
    });
  
    document.getElementById("image").addEventListener("click", () => {
      const sel = window.getSelection().toString();
      if (sel.length === 0) {
        insertText("![]()", -3);
      } else if (notepad.value.includes(sel)) {
        if (isUrl(sel)) {
          insertText(`![](${sel})`, 0 - (3 + sel.length));
        } else {
          insertText(`![${sel}]()`, -1);
        }
      }
      notepad.focus();
    });
  
    document.getElementById("video").addEventListener("click", () => {
      const sel = window.getSelection().toString();
      if (sel.length === 0) {
        insertText("$[]()", -3);
      } else if (notepad.value.includes(sel)) {
        if (isUrl(sel)) {
          insertText(`$[](${sel})`, 0 - (3 + sel.length));
        } else {
          insertText(`$[${sel}]()`, -1);
        }
      }
      notepad.focus();
    });

    document.getElementById("embed").addEventListener("click", () => {
      const sel = window.getSelection().toString();
      if (sel.length === 0) {
        insertText("&[]()", -3);
      } else if (notepad.value.includes(sel)) {
        if (isUrl(sel)) {
          insertText(`&[](${sel})`, 0 - (3 + sel.length));
        } else {
          insertText(`&[${sel}]()`, -1);
        }
      }
      notepad.focus();
    });
  
    document.getElementById("quote").addEventListener("click", () => {
      const sel = window.getSelection().toString();
      if (sel.length === 0) {
        insertText("> ");
      } else if (notepad.value.includes(sel)) {
        insertText(`> ${sel}`, 0);
      }
      notepad.focus();
    });
  
    document.getElementById("unordered-list").addEventListener("click", () => {
      insertText("- \n- \n- ", -6);
      notepad.focus();
    });
  
    document.getElementById("ordered-list").addEventListener("click", () => {
      insertText("1. \n2. \n3. ", -8);
      notepad.focus();
    });
  
    document.getElementById("checkbox").addEventListener("click", (event) => {
      if (event.ctrlKey)  {
        const sel = window.getSelection().toString();
        if (sel.length === 0) {
          insertText("- [x] ");
        } else if (notepad.value.includes(sel)) {
          insertText(`- [x] ${sel}`, 0);
        }
      }
      else {
        const sel = window.getSelection().toString();
        if (sel.length === 0) {
          insertText("- [] ");
        } else if (notepad.value.includes(sel)) {
          insertText(`- [] ${sel}`, 0);
        }
      }
      notepad.focus();
    });
  
    document.getElementById("table").addEventListener("click", () => {
      insertText("|  | title2 | title3 |\n| content1 | content2 | content3 |", -55);
      notepad.focus();
    });    
  }

  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}/last_visit.json`, {
    method: "PUT",
    body: JSON.stringify(getDate())
  });
});

notepad.focus();

function uuid4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function compileMarkdown(text) {
  // create a unique id for each set of footnotes in the document
  const footnote_ids = get_footnote_ids();
  let footnote_uuids = {};
  for (let i = 0; i < get_footnote_count(); i++) {
    footnote_uuids[footnote_ids[i]] = uuid4();
  }

  // add new line to the bottom so that blockquotes at the bottom of the document get recognized, and to the top so lists at the top get recognized
  if (documentData.type !== "code") {
    text = "\n" + text + "\n";
  }

  // tab
  if (documentData.type !== "code") {
    switch (documentData.indentSize) {
      case 2:
        text = text.replace(/\t/g, "&nbsp;&nbsp;");
        break;

      case 3:
        text = text.replace(/\t/g, "&nbsp;&nbsp;&nbsp;");
        break;

      case 4:
        text = text.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
        break;
      
      case 5:
        text = text.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
        break;

      case 6:
        text = text.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
        break;

      case 7:
        text = text.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
        break;

      case 8:
        text = text.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
        break;

      case 9:
        text = text.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
        break;

      case 10:
        text = text.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;");
        break;
    }
  }

  if (documentData.type === "markdown") {
  // angle brackets
    let html = text.replace(/</g, "&lt;").replace(/>/g, "&gt;")

    // newline
    .replace(/\n/g, "<br>")

    // escape characters
    .replace(/\\\#/g, "<HASHTAG>")
    .replace(/\\\*/g, "<ASTERISK>")
    .replace(/\\\_/g, "<UNDERSCORE>")
    .replace(/\\\~/g, "<TILDE>")
    .replace(/\\\`/g, "<BACKTICK>")
    .replace(/\\\^/g, "<CARRET>")
    .replace(/\\\\/g, "<BACKSLASH>")
    .replace(/\\\./g, "<PERIOD>")
    .replace(/\\\|/g, "<PIPE>")
    .replace(/\\\(/g, "<LEFTPAREN>")
    .replace(/\\\)/g, "<RIGHTPAREN>")
    .replace(/\\\[/g, "<LEFTBRACKET>")
    .replace(/\\\]/g, "<RIGHTBRACKET>")
    .replace(/\\\{/g, "<LEFTBRACE>")
    .replace(/\\\}/g, "<RIGHTBRACE>")
    .replace(/\\\</g, "<LEFTANGLE>")
    .replace(/\\\>/g, "<RIGHTANGLE>")
    
    // blockquote
    .replace(/<br>>\s(.*?)<br>/g, "<div class='blockquote'>$1</div>")
    
    // pink color (pink bold)
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    
    // italics  
    .replace(/\*(.*?)\*/g, "<i>$1</i>")
    
    // underline
    .replace(/__(.*?)__/g, "<u>$1</u>")

    // strikethrough
    .replace(/\~\~(.*?)\~\~/g, "<del>$1</del>")

    // img
    .replace(/!\[(.*?)\]\((.*?)\)/g, (c) => {
      const uuid = uuid4();
      const content = c.match(/\[(.*?)\]/g)[0];
      const match = content.match(/\d+x\d+/g);
      const url = c.match(/\((.*?)\)/g)[0];
      let width, height;
      
      if (match) {
        width = match[0].split("x")[0];
        height = match[0].split("x")[1];
      }

      if (width && height) {
        return `<img src="${url.substring(1, url.length - 1)}" alt="${content.substring(1, content.length - 1)}" id="${uuid}" style="width: ${width}%!important; height: ${height}%!important;">`;
      } else {
        return `<img src="${url.substring(1, url.length - 1)}" alt="${content.substring(1, content.length - 1)}" id="${uuid}" style="width: 100%;"><label class="document-content-label" for="${uuid}">${content.substring(1, content.length - 1)}</label>`;
      }
    })

    // video and embed
    .replace(/(\$|&)\[(.*?)\]\((.*?)\)/g, (c) => {
      const uuid = uuid4();
      const content = c.match(/\[(.*?)\]/g)[0];
      const match = content.match(/\d+x\d+/g);
      const url = c.match(/\((.*?)\)/g)[0];
      let width, height;

      if (match) {
        width = match[0].split("x")[0];
        height = match[0].split("x")[1];
      }

      if (width && height) {
        return `<iframe id="${uuid}" src="${url.substring(1, url.length - 1)}" width="${width}%" height="${height}%" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>`;
      } else {
        return `<iframe id="${uuid}" src="${url.substring(1, url.length - 1)}" width="100%" height="100%" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe><label class="document-content-label" for="${uuid}">${content.substring(1, content.length - 1)}</label>`;
      }
    })

    // hyperlink
    .replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' rel='noopener noreferrer' target='_blank' tabindex='-1'>$1</a>")
    
    // highlight
    .replace(/\`(.*?)\`/g, "<mark>$1</mark>")
    
    // checkbox
    .replace(/- \[.?\]\ (.*?)<br>/g, (c) => {
      const uuid = uuid4();
      const is_filled = c.match(/\[x\]/g) !== null;
      const content = c.match(/\ (.*?)<br>/g)[0];
      if (content.includes("|<br>")) {
        return `<div class="mb-3 form-check nmd-checkbox"><input type="checkbox" id="${uuid}" class="form-check-input"${is_filled ? " checked" : ""}><label for="${uuid}" class="form-check-label document-content-label">${content.substring(4, content.length - 5).trim()}</label></div>\|<br>`
      } else {
        return `<div class="mb-3 form-check nmd-checkbox"><input type="checkbox" id="${uuid}" class="form-check-input"${is_filled ? " checked" : ""}><label for="${uuid}" class="form-check-label document-content-label">${content.substring(4, content.length - 4).trim()}</label></div><br>`;
      }
    })

    // horizontal rule
    .replace(/<br>---<br>/g, "<br><hr>");

    const isUpperCase = (string) => /^[A-Z]*$/.test(string);
    const indent_space = documentData.indentSize * 6;

    const alphas = {
      'a': '1', 'b': '2', 'c': '3',
      'd': '4', 'e': '5', 'f': '6',
      'g': '7', 'h': '8', 'i': '9',
      'j': '10', 'k': '11', 'l': '12',
      'm': '13', 'n': '14', 'o': '15',
      'p': '16', 'q': '17', 'r': '18',
      's': '19', 't': '20', 'u': '21',
      'v': '22', 'w': '23', 'x': '24',
      'y': '25', 'z': '26'
    };

    // nested unordered list, nested ordered list, & nested alpha list
    switch (documentData.indentSize) {
      case 2:
        html = html.replace(/(&nbsp;){6}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 3 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-circle"><li>${content}</ul></li></ul></li></ul></li></ul>`;

        })
        
        .replace(/(&nbsp;){4}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 2 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-disc"><li>${content}</li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){2}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space + 2);
          return `<ul><li class="compiled-list"><ul><li>${content}</li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){6}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 3));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){4}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 2));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){2}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + indent_space);
          return `<ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul>`;
        })
        
        .replace(/(&nbsp;){6}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 6];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 3));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){4}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 4];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 2));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){2}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 2];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + indent_space);
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul>`;
        });
        break;

      case 3:
        html = html.replace(/(&nbsp;){9}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 3 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-circle"><li>${content}</ul></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){6}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 2 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-disc"><li>${content}</li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){3}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space + 2);
          return `<ul><li class="compiled-list"><ul><li>${content}</li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){9}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 3));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){6}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 2));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){3}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + indent_space);
          return `<ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul>`;
        })
        
        .replace(/(&nbsp;){9}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 9];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 3));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){6}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 6];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 2));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){3}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 3];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + indent_space);
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul>`;
        });
        break;

      case 4:
        html = html.replace(/(&nbsp;){12}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 3 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-circle"><li>${content}</ul></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){8}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 2 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-disc"><li>${content}</li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){4}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space + 2);
          return `<ul><li class="compiled-list"><ul><li>${content}</li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){12}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 3));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){8}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 2));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){4}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + indent_space);
          return `<ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul>`;
        })
        
        .replace(/(&nbsp;){12}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 12];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 3));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){8}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 8];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 2));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){4}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 4];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + indent_space);
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul>`;
        });
        break;

      case 5:
        html = html.replace(/(&nbsp;){15}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 3 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-circle"><li>${content}</ul></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){10}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 2 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-disc"><li>${content}</li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){5}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space + 2);
          return `<ul><li class="compiled-list"><ul><li>${content}</li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){15}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 3));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){10}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 2));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){5}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + indent_space);
          return `<ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul>`;
        })
        
        .replace(/(&nbsp;){15}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 15];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 3));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){10}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 10];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 2));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){5}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 5];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + indent_space);
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul>`;
        });
        break;

      case 6:
        html = html.replace(/(&nbsp;){18}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 3 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-circle"><li>${content}</ul></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){12}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 2 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-disc"><li>${content}</li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){6}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space + 2);
          return `<ul><li class="compiled-list"><ul><li>${content}</li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){18}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 3));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){12}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 2));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){6}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + indent_space);
          return `<ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul>`;
        })
        
        .replace(/(&nbsp;){18}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 18];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 3));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){12}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 12];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 2));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){6}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 6];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + indent_space);
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul>`;
        });
        break;

      case 7:
        html = html.replace(/(&nbsp;){21}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 3 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-circle"><li>${content}</ul></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){14}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 2 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-disc"><li>${content}</li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){7}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space + 2);
          return `<ul><li class="compiled-list"><ul><li>${content}</li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){21}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 3));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){14}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 2));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){7}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + indent_space);
          return `<ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul>`;
        })
        
        .replace(/(&nbsp;){21}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 21];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 3));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){14}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 14];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 2));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){7}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 7];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + indent_space);
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul>`;
        });
        break;

      case 8:
        html = html.replace(/(&nbsp;){24}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 3 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-circle"><li>${content}</ul></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){16}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 2 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-disc"><li>${content}</li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){8}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space + 2);
          return `<ul><li class="compiled-list"><ul><li>${content}</li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){24}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 3));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){16}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 2));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){8}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + indent_space);
          return `<ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul>`;
        })
        
        .replace(/(&nbsp;){24}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 24];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 3));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){16}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 16];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 2));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){8}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 8];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + indent_space);
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul>`;
        });
        break;

      case 9:
        html = html.replace(/(&nbsp;){27}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 3 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-circle"><li>${content}</ul></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){18}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 2 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-disc"><li>${content}</li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){9}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space + 2);
          return `<ul><li class="compiled-list"><ul><li>${content}</li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){27}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 3));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){18}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 2));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){9}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + indent_space);
          return `<ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul>`;
        })
        
        .replace(/(&nbsp;){27}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 27];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 3));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){18}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 18];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 2));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){9}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 9];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + indent_space);
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul>`;
        });
        break;

      case 10:
        html = html.replace(/(&nbsp;){30}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 3 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-circle"><li>${content}</ul></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){20}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space * 2 + 2);
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul class="list-disc"><li>${content}</li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){10}- (.*?)(?:(?!<br>).)*/g, (c) => {
          const content = c.substring(indent_space + 2);
          return `<ul><li class="compiled-list"><ul><li>${content}</li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){30}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 3));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){20}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + (indent_space * 2));
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){10}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const number = c.match(/\d{1,3}/g)[0];
          const content = c.substring(2 + number.length + indent_space);
          return `<ul><li class="compiled-list"><ol start="${number}"><li>${content}</li></ol></li></ul>`;
        })
        
        .replace(/(&nbsp;){30}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 30];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 3));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul></li></ul>`;
        })
        
        .replace(/(&nbsp;){20}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 20];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + (indent_space * 2));
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul></li></ul>`;
        })

        .replace(/(&nbsp;){10}[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
          const letter = c.match(/[A-Za-z]/g)[4 * 10];
          const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
          const content = c.substring(3 + indent_space);
          const type = isUpperCase(letter) ? "A" : "a";
          const paren_list = c.match(/\)/g)?.slice(-1) ? true : false;
          return `<ul><li class="compiled-list"><ol type="${type}" start="${alpha}" ${paren_list ? 'class="remove-list-padding"' : ''}><li ${paren_list ? 'class="list-parenthesis"' : ''}>${content}</li></ol></li></ul>`;
        });
        break;
    }

    // regular unordered list
    html = html.replace(/<br>- (.*?)(?:(?!<br>).)*/g, (c) => {
      const content = c.substring(6);
      return `<ul><li>${content}</li></ul>`;
    })
    .replace(/<\/ul><br>/g, "</ul>")

    // regular ordered list
    .replace(/<br>\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
      const number = c.match(/\d{1,3}/g)[0];
      const content = c.substring(c.indexOf(/\d{1,3}/g) + 5 + number.length + 2);
      return `<ol start="${number}"><li>${content}</li></ol>`;
    })

    // regular alpha list
    .replace(/<br>[A-Za-z](\)|\.)\ (.*?)(?:(?!<br>).)*/g, (c) => {
      const letter = c.match(/[A-Za-z]/g)[2];
      const alpha = alphas[letter.toLowerCase()]; // 2 because "b" and "r" become first letters. ex: a. asd = ['b', 'r', 'b', 'a', 's', 'd']
      const content = c.substring(7);
      const type = isUpperCase(letter) ? "A" : "a";
      return `<ol type="${type}" start="${alpha}"><li>${content}</li></ol>`;
    })
    .replace(/<\/ol><br>/g, "</ol>")

    // right-align brackets
    .replace(/\{\{(.*?)\}\}<br>/g, "<div style='text-align: right;'>$1</div>")
    
    // center brackets
    .replace(/\{(.*?)\}<br>/g, "<center>$1</center>")

    // headers
    .replace(/#{5}\s?(.*?)<br>/g, "<h5>$1</h5>")
    .replace(/#{4}\s?(.*?)<br>/g, "<h4>$1</h4>")
    .replace(/#{3}\s?(.*?)<br>/g, "<h3>$1</h3>")
    .replace(/#{2}\s?(.*?)<br>/g, "<h2>$1</h2>")
    .replace(/#{1}\s?(.*?)<br>/g, "<h1>$1</h1>")

    // table
    .replace(/(<br>\|\s?(.*?)\s?\|(?:(?!<br>).)*){2,}/g, (c) => {
      let rows = c.split('<br>').slice(1);
      const headers = "<tr class='nmd-tr'>" + rows.shift().split('|').slice(1, -1).map((header) => `<th class="nmd-th"><center>${header.trim()}</center></th>`).join("") + "</tr>";
      const rows_html = rows.map((row) => "<tr class='nmd-tr'>" + (row.split('|').slice(1, -1).map((cell) => row.endsWith('!') ? `<td class="nmd-td"><center>${cell.trim()}</center></td>` : row.endsWith('$') ? `<td class="table-right-align nmd-td">${cell.trim()}</td>` : `<td class="nmd-td">${cell.trim()}</td>`).join("")) + "</tr>").join("");
      return `<table class="nmd-table">${headers}${rows_html}</table>`;
    })

    // footnote-bottom
    .replace(/\[\^(\d{1,5})\]\: (.*?)<br>/g, (c) => {
      const footnote_id = c.substring(2, c.indexOf("]"));
      const footnote_uuid = footnote_uuids[footnote_id];
      const footnote_content = c.substring(c.indexOf("]: ") + 3, c.length - 4);
      return `<span class='footnote-bottom' data-footnote-id="${footnote_id}" id="${footnote_uuid}"><sup><u>${footnote_id}</u></sup> ${footnote_content}</span><br>`;
    })

    // footnote-top
    .replace(/\[\^(\d{1,5})\]/g, (c) => {
      const footnote_id = c.substring(c.indexOf("[^") + 2, c.length - 1);
      const footnote_uuid = footnote_uuids[footnote_id]?.trim();
      if (!footnote_uuid) return c;
      return `<span class="footnote-top" onclick="show_footnote('${footnote_uuid}')"><sup>[${footnote_id}]</sup></span>`;
    })

    // superscript
    .replace(/\^(.*?)\^/g, "<sup>$1</sup>")

    // escape characters
    .replace(/<HASHTAG>/g, "<span class='replaced-symbol'>#</span>")
    .replace(/<ASTERISK>/g, "<span class='replaced-symbol'>*</span>")
    .replace(/<UNDERSCORE>/g, "<span class='replaced-symbol'>_</span>")
    .replace(/<TILDE>/g, "<span class='replaced-symbol'>~</span>")
    .replace(/<BACKTICK>/g, "<span class='replaced-symbol'>`</span>")
    .replace(/<CARRET>/g, "<span class='replaced-symbol'>^</span>")
    .replace(/<BACKSLASH>/g, "<span class='replaced-symbol'>\\</span>")
    .replace(/<PIPE>/g, "<span class='replaced-symbol'>|</span>")
    .replace(/<PERIOD>/g, "<span class='replaced-symbol'>.</span>")
    .replace(/<LEFTPAREN>/g, "<span class='replaced-symbol'>(</span>")
    .replace(/<RIGHTPAREN>/g, "<span class='replaced-symbol'>)</span>")
    .replace(/<LEFTBRACKET>/g, "<span class='replaced-symbol'>[</span>")
    .replace(/<RIGHTBRACKET>/g, "<span class='replaced-symbol'>]</span>")
    .replace(/<LEFTBRACE>/g, "<span class='replaced-symbol'>{</span>")
    .replace(/<RIGHTBRACE>/g, "<span class='replaced-symbol'>}</span>")
    .replace(/<LEFTANGLE>/g, "<").replace(/<RIGHTANGLE>/g, ">")

    // save datbase storage space by removing empty elements (eg. user types **********, creating a bunch of empty <b> or <i> tags)
    .replace(/<i><\/i>/g, "")
    .replace(/<b><\/b>/g, "")
    .replace(/<u><\/u>/g, "")
    .replace(/<s><\/s>/g, "")
    .replace(/<sup><\/sup>/g, "")
    .replace(/<center><\/center>/g, "")
    .replace(/<div style="text-align: right;"><\/div>/g, "")
    .replace(/<h1><\/h1>/g, "")
    .replace(/<h2><\/h2>/g, "")
    .replace(/<h3><\/h3>/g, "")
    .replace(/<h4><\/h4>/g, "")
    .replace(/<h5><\/h5>/g, "")
    .replace(/<mark><\/mark>/g, "")
    .replace(/<div class='blockquote'><\/div>/g, "")

    if (html.startsWith("<br>")) {
      html = html.substring(4, html.length);
    }
    
    if (html.endsWith("<br>")) {
      return html.substring(0, html.length - 4);
    }
  
    return html;
  } else if (documentData.type === "code") {
    // <pre><code class="language-python">HTML</code></pre>
    const lang = langs[documentData.language];
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.classList.add("language-" + lang);
    code.textContent = text.replace(/&gt;/g, ">").replace(/&lt;/g, "<");
    pre.appendChild(code);
    return pre.outerHTML;
  } else if (documentData.type === "text") {
    return text.replace(/\n/g, "<br>");
  }
}

function showSpinner() {
  document.getElementById("loading-spinner").style.visibility = "visible";
}

function hideSpinner() {
  document.getElementById("loading-spinner").style.visibility = "hidden";
}

function setSaveStatus(status) {
  let ele_;
  switch (status) {
    case "saved":
      ele_ = document.getElementById("save-status");
      ele_.innerText = "No New Changes";
      ele_.style.color = "#28a745";
      break;
    case "saving":
      ele_ = document.getElementById("save-status")
      ele_.innerText = "Saving Changes...";
      ele_.style.color = "#ffc107";
      break;
    case "not-saved":
      ele_ = document.getElementById("save-status");
      ele_.innerText = "Unsaved Changes";
      ele_.style.color = "tomato";
      break;
  }
}

async function updateCheckbox(email, element_id, status) {
  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/checkboxes/${document_uuid}/${email}/${element_id}.json`, {
    method: "PUT",
    body: JSON.stringify(status ? 1 : 0)
  });
}

async function saveDocument() {
  let text = notepad.value;
  
  if (text === previousText) {
    setSaveStatus("saved");
    return;
  }
  
  showSpinner();
  setSaveStatus("saving");
  text = text.trimEnd();

  // set the previous text to the current text
  previousText = JSON.parse(JSON.stringify({text})).text; // deepcopy
  
  // compile the markdown to html
  let html = compileMarkdown(text);

  // if (documentData.type === "code") {
  //   html = html.substring(0, 39) + html.substring(40, html.length);
  // }

  // check if the new html is different from the previous html
  if (html === previousHTML) {
    hideSpinner();
    setSaveStatus("saved");
    return;
  }

  // set the document div to the new html
  doc.innerHTML = `${documentData.type === "markdown" ? '<div id="footnotes-alert-placeholder"></div>' : ''}${html}`;
  hljs.highlightAll();
  
  if (LINE_NUMBERS_ENABLED) {
    hljs.initLineNumbersOnLoad();
  }

  addBoldEventListeners();

  // set the previous html to the new html
  previousHTML = JSON.parse(JSON.stringify({html})).html; // deepcopy
  const email = JSON.parse(getCookie("nmd-validation")).email.replace(/\./g, ",");

  // check for checkboxes
  (async () => {
    let checkboxes = Array.from(doc.querySelectorAll("input[type='checkbox']"));
    if (checkboxes.length) {
      checkboxes.forEach((checkbox, i) => {
        checkbox.id = CHECKBOX_IDS[i];

        checkbox.addEventListener("change", (event) => {
          updateCheckbox(email, event.target.id, event.target.checked);
        });
      });
    }
  })();

  // upload the document to the server
  await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}.json`, {
    method: "PUT",
    body: JSON.stringify({
      title: documentData.title,
      owner: documentData.owner.replace(/\./g, ","),
      content: text,
      last_visit: getDate(),
      created: documentData.created,
      description: documentData.description,
      type: documentData.type,
      visibility: documentData.visibility,
      language: documentData.language,
      theme: documentData.theme,
      font: documentData.font,
      fontSize: documentData.fontSize,
      indentSize: documentData.indentSize,
      authors: documentData.authors,
    })
  });

  documentData.content = text;
  hideSpinner();
  setSaveStatus("saved");
}

function getStartAndEndPositions() {
  return { start: notepad.selectionStart, end: notepad.selectionEnd };
}

let location_before_last_insert = [ { start: 0, end: 0 } ];

function insertText(text, cursor_movement = 0) {
  setSaveStatus("not-saved");
  const { start, end } = getStartAndEndPositions();
  location_before_last_insert.unshift({ start, end });
  notepad.focus();

  document.execCommand('selectAll', false);
  var el = document.createElement('p');
  el.innerText = notepad.value.substring(0, start) + text + notepad.value.substring(end);
  const previousScrollLocation = notepad.scrollTop;
  document.execCommand('insertHTML', false, el.innerHTML);
  notepad.scrollTop = previousScrollLocation;
  notepad.selectionStart = notepad.selectionEnd = start + text.length + cursor_movement;
}

document.addEventListener("keypress", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    notepad.focus();
    return;
  }

  if (event.ctrlKey && event.shiftKey && event.code === "KeyF") {
    event.preventDefault();
    new bootstrap.Modal(document.getElementById("search-modal")).show();
    return;
  }
});

async function check_for_changes() {
  if (previousText.trimEnd() !== notepad.value.trimEnd()) {
    setSaveStatus("not-saved");
    previousText === notepad.value;
  }
}

// automatically update on change
notepad.addEventListener("input", (e) => {
  // automatically update display - but do not save
  doc.innerHTML = compileMarkdown(notepad.value);
  
  // highlight code after change - line numbers will be removed
  // from the screen until the doc is saved again
  if (documentData.type === "code") {
    hljs.highlightAll();
  }
});

document.getElementById("notepad").addEventListener("keydown", (event) => {
  check_for_changes();
  const sel = window.getSelection().toString();

  // insert two slashes to form a comment
  // add the comment to the beginning of the line
  if (event.key === "/" && documentData.type === "code") {
    event.preventDefault();
    
    // prev positions
    let prev_start = notepad.selectionStart;
    let prev_end = notepad.selectionEnd;
    
    // move cursor to beginning of line
    notepad.selectionStart = notepad.selectionEnd = notepad.value.substring(0, notepad.selectionStart).lastIndexOf("\n") + 1;
    
    // add comment
    insertText("// ", 0);

    // return to original position
    notepad.selectionStart = prev_start + 3;
    notepad.selectionEnd = prev_end + 3;
    return;
  }

  // close alert if present, exit fullscreen if in fullscreen, or unfocus notepad otherwise
  if (event.key === "Escape") {
    event.preventDefault();
    if (document.getElementById("footnotes-alert-placeholder").innerHTML !== "") {
      document.getElementById("footnotes-alert-placeholder").innerHTML = "";
      return;
    }
    if (notepad.dataset.fullscreen === "true" ? true : false) {
      document.querySelector("span.fullscreen").click();
      notepad.focus();
    } else {
      notepad.blur();
    }
    return;
  }

  if ((event.key === "Delete" || event.key === "Backspace" || event.key === "Enter") && sel === "") {
    const previous_cursor_location = notepad.selectionStart;
    const lines = notepad.value.split("\n");
    const line = notepad.value.substring(0, notepad.selectionStart).split("\n").length;

    let start_of_line = 0;
    for (let i = 0; i < line - 1; i++) {
      start_of_line += lines[i].length + 1;
    }
    
    const end_of_line = start_of_line + lines[line - 1].length;
    let line_content = notepad.value.substring(start_of_line, end_of_line);
  
    // regular expressions
    const letter_dot = new RegExp(/^\t+[a-zA-Z]\.\s$/);
    const number_dot = new RegExp(/^\t+\d+\.\s$/);
    const letter_paren = new RegExp(/^\t+[a-zA-Z]\)\s$/);

    if (line_content === "- " || letter_dot.test(line_content) || number_dot.test(line_content) || letter_paren.test(line_content)) {
      event.preventDefault();
      notepad.focus();
      notepad.selectionStart = start_of_line;
      notepad.selectionEnd = end_of_line;
      document.execCommand("delete");
      notepad.selectionStart = notepad.selectionEnd = previous_cursor_location - 2;

      if (event.key === "Enter") {
        insertText("\n");
      }
      return;
    }
  }

  // move the line back 1-tab worth
  if (event.code === "Tab" && event.shiftKey && notepad.selectionStart === notepad.selectionEnd) {
    event.preventDefault();
    const previous_cursor_location = notepad.selectionStart;
    const lines = notepad.value.split("\n");
    const line = notepad.value.substring(0, notepad.selectionStart).split("\n").length;

    let start_of_line = 0;
    for (let i = 0; i < line - 1; i++) {
      start_of_line += lines[i].length + 1;
    }
    
    const end_of_line = start_of_line + lines[line - 1].length;
    let line_content = notepad.value.substring(start_of_line, end_of_line);
    if (!(line_content.startsWith("|") && line_content.startsWith("|"))) {
      const indent_count = line_content.match(/^\t*/)[0].length || line_content.match(/^\s*/)[0].length;
      let indents = "";

      if (indent_count) {
        const indent_type = line_content.match(/^\t+/) ? "TAB" : "SPACE";
        if (indent_type === "TAB") {
          indents = "\t".repeat(indent_count - 1);
        } else {
          indents = " ".repeat(indent_count - 1);
        }
      }

      // remove leading tabs and spaces
      line_content = line_content.replace(/^\t+/, "").replace(/^\s+/, "");

      const value = notepad.value.substring(0, start_of_line) + indents + line_content + notepad.value.substring(end_of_line);
      document.execCommand('selectAll', false);
      var el = document.createElement('p');
      el.innerText = value;
      const previousScrollLocation = notepad.scrollTop;
      document.execCommand('insertHTML', false, el.innerHTML);
      notepad.scrollTop = previousScrollLocation;
      notepad.selectionStart = notepad.selectionEnd = previous_cursor_location - 1;
      return;
    }
  }

  // table cell move
  if (event.key === "Tab") {
    event.preventDefault();
    const lines = notepad.value.split("\n");
    const line = notepad.value.substring(0, notepad.selectionStart).split("\n").length;

    let start_of_line = 0;
    for (let i = 0; i < line - 1; i++) {
      start_of_line += lines[i].length + 1;
    }
    
    const end_of_line = start_of_line + lines[line - 1].length;
    let line_content = notepad.value.substring(start_of_line, end_of_line).trim();

    if (line_content.startsWith("|") && line_content.endsWith("|")) {
      // line_content = line_content.substring(1, line_content.length - 1);
      const cells = line_content.split("|");
      let cell = 0;
      let cell_start = 0;

      for (let i = 0; i < cells.length; i++) {
        cell_start += cells[i].length + 1;
        if (cell_start > notepad.selectionStart - start_of_line) {
          cell = i;
          break;
        }
      }

      if (cell === cells.length - 2) {
        // last cell, go to newline
        if (!event.shiftKey) {
          notepad.selectionStart = notepad.selectionEnd = end_of_line + 1;
          // cursor would only go to the beginning of the line, but pressing tab again
          // will move it to the next cell
          notepad.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
          return;
        }
      }

      if (cell === cells.length - 1) {
        if (!event.shiftKey) {
          notepad.selectionStart = notepad.selectionEnd = start_of_line + cell_start + 2;
        } else {
          // go to previous cell
          if (notepad.value[start_of_line + cell_start - cells[cell].length - cells[cell - 1].length - 2] === " ") {
            notepad.selectionStart = start_of_line + cell_start - cells[cell].length - cells[cell - 1].length - 1;
          } else {
            notepad.selectionStart = start_of_line + cell_start - cells[cell].length - cells[cell - 1].length - 2;
          }

          if (notepad.value[start_of_line + cell_start - cells[cell].length - 3] === " ") {
            notepad.selectionEnd = start_of_line + cell_start - cells[cell].length - 3;
          } else {
            notepad.selectionEnd = start_of_line + cell_start - cells[cell].length - 2;
          }
        }
      } else {
        if (event.shiftKey) {
          // last cell in line
          if (cell === 0) {
            notepad.selectionStart = notepad.selectionEnd = start_of_line - 1;
            // cursor would only go to the beginning of the line, but pressing tab again
            // will move it to the next cell
            notepad.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true }));
            return;
          }

          // go to previous cell
          if (notepad.value[start_of_line + cell_start - cells[cell].length - cells[cell - 1].length - 2] === " ") {
            notepad.selectionStart = start_of_line + cell_start - cells[cell].length - cells[cell - 1].length - 1;
          } else {
            notepad.selectionStart = start_of_line + cell_start - cells[cell].length - cells[cell - 1].length - 2;
          }

          if (notepad.value[start_of_line + cell_start - cells[cell].length - 3] === " ") {
            notepad.selectionEnd = start_of_line + cell_start - cells[cell].length - 3;
          } else {
            // first cell inline, but shift+tab goes backwards so we need to go to the end of the line cell
            notepad.selectionEnd = start_of_line + cell_start - cells[cell].length - 2;
            // cursor would only go to the beginning of the line, but pressing tab again
            // will move it to the next cell
            notepad.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true }));
          }

          // notepad.selectionStart = start_of_line + cell_start - cells[cell].length - cells[cell - 1].length - 1;
          // notepad.selectionEnd = start_of_line + cell_start - cells[cell - 1].length - 4;
        } else {
          // go to next cell
          if (notepad.value[start_of_line - 1 + cell_start + cells[cell + 1].length] !== " ") {
            notepad.selectionStart = start_of_line + cell_start;
            notepad.selectionEnd = start_of_line + cell_start + cells[cell + 1].length;
          } else {
            if (notepad.value[start_of_line + cell_start] !== " ") {
              notepad.selectionStart = start_of_line + cell_start;
              notepad.selectionEnd = start_of_line + cell_start + cells[cell + 1].length - 1;
            } else {
              notepad.selectionStart = start_of_line + cell_start + 1;
              notepad.selectionEnd = start_of_line + cell_start + cells[cell + 1].length - 1;
            }
          }
        }
      }
    } else {
      /* regular tab press */
      
      // already handled
      if (event.shiftKey) return;

      // check if the cursor is at a place in the note that looks like this:
      /*
        lorem ipsum dolor sit amet
        - <cursor>
      */
     // if the user pressed tab right there, the tab should be added to the beginning of the line instead
     // so that the output looks like this:
     /*
        lorem ipsum dolor sit amet
            - <cursor>
      */

     const start = notepad.selectionStart;
     const end = notepad.selectionEnd;
     
     // handle index error
     try {
       // only if nothing has been selected
       if (start === end) {
        notepad.selectionStart = notepad.selectionEnd = notepad.value.substring(0, start).lastIndexOf("\n") + 1;
        // support single, double, & triple nesting
        if (
          (notepad.value[notepad.selectionStart] === "-")
            ||
          (notepad.value[notepad.selectionStart] === "\t" && notepad.value[notepad.selectionStart + 1] === "-")
            ||
          (notepad.value[notepad.selectionStart] === "\t" && notepad.value[notepad.selectionStart + 1] === "\t" && notepad.value[notepad.selectionStart + 2] === "-")
        ) {
          insertText("\t");
          notepad.selectionStart = start + 1;
          notepad.selectionEnd = end + 1;
        } else {
          // add tab in the original position  
          notepad.selectionStart = start;
          notepad.selectionEnd = end;
          insertText("\t");
        }
      }
     } catch (e) {};
    }
  }

  if (event.altKey) {
    switch (event.code) {
      // scroll down
      case "ArrowDown":
        event.preventDefault();
        notepad.scrollBy(0, 30);
        break;

      // scroll up
      case "ArrowUp":
        event.preventDefault();
        notepad.scrollBy(0, -30);
        break;
      
      // horizontal rule
      case "KeyR":
        if (documentData.type === "markdown") {
          event.preventDefault();
          insertText("---\n");
        }
        break;

      // video
      case "KeyV":
        if (documentData.type === "markdown") {
          event.preventDefault();
          if (sel.length === 0) {
            insertText("$[]()", -3);
          } else if (notepad.value.includes(sel)) {
            if (isUrl(sel)) {
              insertText(`$[](${sel})`, 0 - (3 + sel.length));
            } else {
              insertText(`$[${sel}]]()`, -1);
            }
          }
        }
        break;

      // lists
      case "KeyL":
        if (documentData.type === "markdown") {
          if (event.shiftKey) {
            event.preventDefault();
            insertText("1. \n2. \n3. ", -8);
          } else {
            event.preventDefault();
            insertText("- \n- \n- ", -6);
          }
        }
        break;
      
      // checkbox
      case "KeyC":
        if (documentData.type === "markdown") {
          // unchecked
          if (event.shiftKey) {
            event.preventDefault();
            if (sel.length === 0) {
              insertText("- [x] ");
            } else if (notepad.value.includes(sel)) {
              insertText(`- [x] ${sel}`, 0);
            }
          } else { // checked
            event.preventDefault();
            if (sel.length === 0) {
              insertText("- [] ");
            } else if (notepad.value.includes(sel)) {
              insertText(`- [] ${sel}`, 0);
            }
          }
        }
        break;

      // strikethrough
      case "KeyS":
        if (documentData.type === "markdown") {
          if (event.ctrlKey) break;
          event.preventDefault();
          if (sel.length === 0) {
            insertText("~~~~", -2);
          } else if (notepad.value.includes(sel)) {
            insertText(`~~${sel}~~`, 0);
          }
        }
        break;

      // highlight
      case "KeyH":
        if (documentData.type === "markdown") { 
          event.preventDefault();
          if (sel.length === 0) {
            insertText("``", -1);
          } else if (notepad.value.includes(sel)) {
            insertText(`\`${sel}\``, 0);
          }
        }
        break;
      
      // table
      case "KeyT":
        if (event.shiftKey) break;
        if (documentData.type === "markdown") {
          event.preventDefault();
          insertText("|  | title2 | title3 |\n| content1 | content2 | content3 |", -55);
        }
        break;
      
      // iframe embed
      case "KeyE":
        if (documentData.type === "markdown") {
          event.preventDefault();
          if (sel.length === 0) {
            insertText("&[]()", -3);
          } else if (notepad.value.includes(sel)) {
            if (isUrl(sel)) {
              insertText(`&[](${sel})`, 0 - (3 + sel.length));
            } else {
              insertText(`&[${sel}]()`, -1);
            }
          }
        }
        break;
    }
  }

  if (event.code === "Enter" && documentData.type === "markdown" && notepad.selectionStart === notepad.selectionEnd) {
    if (event.ctrlKey) {
      // regular enter
      event.preventDefault();
      insertText('\n');
      return;
    }

    const lines = notepad.value.split("\n");
    const line = notepad.value.substring(0, notepad.selectionStart).split("\n").length;

    let start_of_line = 0;
    for (let i = 0; i < line - 1; i++) {
      start_of_line += lines[i].length + 1;
    }
    
    const end_of_line = start_of_line + lines[line - 1].length;

    if (event.shiftKey) {
      // add line break to the beginning of a line (move the line down)
      event.preventDefault();
      const line_content = notepad.value.substring(start_of_line, end_of_line);
      document.execCommand('selectAll', false);
      var el = document.createElement('p');
      el.innerText = notepad.value.substring(0, start_of_line - 1) + "\n" + line_content + notepad.value.substring(end_of_line);
      const previousScrollLocation = notepad.scrollTop;
      document.execCommand('insertHTML', false, el.innerHTML);
      notepad.scrollTop = previousScrollLocation;
      console.log(start_of_line, start_of_line + line_content.length)
      notepad.selectionStart = notepad.selectionEnd = start_of_line + line_content.length + 1;
      setSaveStatus("not-saved");
      const { start, end } = getStartAndEndPositions();
      location_before_last_insert.unshift({ start, end });
      return;
    }

    if (end_of_line !== notepad.selectionStart) return;

    const line_content = notepad.value.substring(start_of_line, end_of_line);
    const indent_count = line_content.match(/^\t*/)[0].length || line_content.match(/^\s*/)[0].length;
    let indents = "";
    if (indent_count) {
      const indent_type = line_content.match(/^\t+/) ? "TAB" : "SPACE";
      if (indent_type === "TAB") {
        indents = "\t".repeat(indent_count);
      } else {
        indents = " ".repeat(indent_count);
      }
    }

    if (line_content.trim().match(/- (.*?)/g)) {
      event.preventDefault();
      insertText(`\n${indents}- `);
    } else if (line_content.trim().match(/\d+\. (.*?)/g)) {
      event.preventDefault();
      const number = line_content.match(/\d+/g)[0];
      insertText(`\n${indents}${parseInt(number) + 1}. `);
    } else if (line_content.trim().match(/[a-z]+(\)|\.) (.*?)/g)) {
      event.preventDefault();
      const type = line_content.match(/\)|\./g)[0];
      const letter = line_content.match(/[a-z]+/g)[0];
      let new_letter = String.fromCharCode(letter.charCodeAt(0) + 1);
      if (letter === "z") new_letter = "a";
      insertText(`\n${indents}${new_letter}${type} `);
    } else if (line_content.trim().match(/[A-Z]+(\)|\.) (.*?)/g)) {
      event.preventDefault();
      const type = line_content.match(/\)|\./g)[0];
      const letter = line_content.match(/[A-Z]+/g)[0];
      let new_letter = String.fromCharCode(letter.charCodeAt(0) + 1);
      if (letter === "Z") new_letter = "A";
      insertText(`\n${indents}${new_letter}${type} `);
    }
  }

  if (event.ctrlKey) {
    switch (event.code) {
      // search func
      case "KeyF":
        if (event.shiftKey) {
          event.preventDefault();
          new bootstrap.Modal(document.getElementById("search-modal")).show();
        }
        break;

      // ctrl + shift + right_arrow = select word
      case "ArrowRight":
        event.preventDefault();
        const endOfWord = Math.min(
          1 + notepad.value.indexOf(" ", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("\n", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf(".", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf(",", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("!", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("?", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("@", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("#", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("$", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("%", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("*", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("(", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf(")", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("{", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("}", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("[", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("]", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("`", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("~", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("__", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("^^", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("+", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("=", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("|", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf("\"", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf(":", notepad.selectionEnd + 1) || 999999999,
          1 + notepad.value.indexOf(";", notepad.selectionEnd + 1) || 999999999,
        ) - 1;
        if (event.shiftKey) {
          notepad.selectionEnd = endOfWord;
        } else {
          notepad.selectionStart = notepad.selectionEnd = endOfWord;
        }
        break;

      // delete line
      case "KeyK":
        event.preventDefault();
        if (event.shiftKey) {
          const { start, end } = getStartAndEndPositions();
          location_before_last_insert.unshift({ start, end });
          if (notepad.selectionStart === notepad.selectionEnd) {
            const lines = notepad.value.split("\n");
            const line = notepad.value.substring(0, notepad.selectionStart).split("\n").length;
            let start_of_line = 0;
            for (let i = 0; i < line - 1; i++) {
              start_of_line += lines[i].length + 1;
            }
            const end_of_line = start_of_line + lines[line - 1].length;
            document.execCommand('selectAll', false);
            var el = document.createElement('p');
            el.innerText = notepad.value.substring(0, start_of_line - 1) + notepad.value.substring(end_of_line);
            const previousScrollLocation = notepad.scrollTop;
            document.execCommand('insertHTML', false, el.innerHTML);
            notepad.scrollTop = previousScrollLocation;
            notepad.selectionStart = notepad.selectionEnd = start_of_line;
          } else {
            document.execCommand('selectAll', false);
            var el = document.createElement('p');
            el.innerText = notepad.value.substring(0, notepad.selectionStart) + notepad.value.substring(notepad.selectionEnd);
            document.execCommand('insertHTML', false, el.innerHTML);
            notepad.selectionStart = notepad.selectionEnd = start;
          }
        } else {
          if (documentData.type === "markdown") {
            // hyperlink
            event.preventDefault();
            if (sel.length === 0) {
              insertText("[]()", -3);
            } else if (notepad.value.includes(sel)) {
              if (isUrl(sel)) {
                insertText(`[](${sel})`, 0 - (3 + sel.length));
              } else {
                insertText(`[${sel}]()`, -1);
              }
            }
          }
        }
        break;

      // copy line is there is no currently selected text
      case "KeyC":
        if (notepad.selectionStart === notepad.selectionEnd) {
          event.preventDefault();
          const lines = notepad.value.split("\n");
          const line = notepad.value.substring(0, notepad.selectionStart).split("\n").length;

          let start_of_line = 0;
          for (let i = 0; i < line - 1; i++) {
            start_of_line += lines[i].length + 1;
          }
          const end_of_line = start_of_line + lines[line - 1].length;
          navigator.clipboard.writeText(notepad.value.substring(start_of_line - 1, end_of_line));
          notepad.selectionStart = notepad.selectionEnd = end_of_line;
        }
        break;

      // word count, alternative shortcut (original is alt + shift + p)
      case "KeyP":
        if (event.shiftKey) {
          event.preventDefault();
          new bootstrap.Modal(document.getElementById("word-count-modal")).show();
        }
        break;

      case "KeyZ":
        new Promise((_r) => {
          setTimeout(_r, 1);
        }).then(() => {
          if (notepad.selectionStart === 0 && notepad.selectionEnd === notepad.value.length) {
            notepad.selectionStart = location_before_last_insert[0].start;
            notepad.selectionEnd = location_before_last_insert[0].end;
            location_before_last_insert.shift();
          }
        });
        break;

      // italics
      case "KeyI":
        if (documentData.type === "markdown") {
          if (event.shiftKey) {
            return;
          }
          event.preventDefault();
          if (sel.length === 0) {
            insertText("**", -1);
          } else if (notepad.value.includes(sel)) {
            insertText(`*${sel}*`, 0);
          }
        }
        break;

      // pink color (pink bold)
      case "KeyB":
        if (documentData.type === "markdown") {
          event.preventDefault();
          if (sel.length === 0) {
            insertText("****", -2);
          } else if (notepad.value.includes(sel)) {
            insertText(`**${sel}**`, 0);
          };
        }
        break;

      // underline
      case "KeyU":
        if (documentData.type === "markdown") {  
          event.preventDefault();
          if (sel.length === 0) {
            insertText("____", -2);
          } else if (notepad.value.includes(sel)) {
            insertText(`__${sel}__`, 0);
          }
        }
        break;

      // save document
      case "KeyS":
        event.preventDefault();
        saveDocument();
        break;

      // highlight
      case "KeyH":
        if (documentData.type === "markdown") {
          event.preventDefault();
          if (sel.length === 0) {
            insertText("``", -1);
          } else if (notepad.value.includes(sel)) {
            insertText(`\`${sel}\``, 0);
          }
        }
        break;

      // image
      case "KeyM":
        if (documentData.type === "markdown") {
          event.preventDefault();
          if (sel.length === 0) {
            insertText("![]()", -3);
          } else if (notepad.value.includes(sel)) {
            if (isUrl(sel)) {
              insertText(`![](${sel})`, 0 - (3 + sel.length));
            } else {
              insertText(`![${sel}]()`, -1);
            }
          }
        }
        break;

      // quote
      case "KeyQ":
        if (documentData.type === "markdown") {
          event.preventDefault();
          if (sel.length === 0) {
            insertText("> ");
          } else if (notepad.value.includes(sel)) {
            insertText(`> ${sel}`, 0);
          }
        }
        else if (documentData.type === "code") {
          event.preventDefault();
          document.getElementById("run-code-btn").click();
        }
        break;

      // footnote
      case "Digit6":
        if (documentData.type === "markdown") {
          if (event.shiftKey) {
            event.preventDefault();
            const location = notepad.selectionStart;
            const footnote_count = get_footnote_count() + 1;
            insertText(`[^${footnote_count}]`);
            notepad.selectionStart = notepad.value.length;
            notepad.value += `\n[^${footnote_count}]: `;
            notepad.selectionStart = notepad.selectionEnd = location + `[^${footnote_count}]`.length;
          }
        }
        break;

      // superscript
      case "Period":
        if (documentData.type === "markdown") {  
          event.preventDefault();
          if (sel.length === 0) {
            insertText("^^", -1);
          } else if (notepad.value.includes(sel)) {
            insertText(`^${sel}^`, 0);
          }
        }
        break;

      // center align
      case "BracketLeft":
        if (documentData.type === "markdown") {
          event.preventDefault();
          if (sel.length === 0) {
            insertText("{}", -1);
          } else if (notepad.value.includes(sel)) {
            insertText(`{${sel}}`, 0);
          }
        }
        break;

      // right align
      case "BracketRight":
        if (documentData.type === "markdown") {
          event.preventDefault();
          if (sel.length === 0) {
            insertText("{{}}", -2);
          } else if (notepad.value.includes(sel)) {
            insertText(`{{${sel}}}`, 0);
          }
        }
        break;
    }
  }
});

document.getElementById("save").addEventListener("click", () => {
  saveDocument();
  notepad.focus();
});

const modal_new_title_input = document.querySelector("div.modal-body > form > div.mb-3 > input");

document.querySelector("document-title").addEventListener("click", () => {
  modal_new_title_input.value = documentData.title;
  new bootstrap.Modal(document.getElementById("change-title-modal")).show();
});

document.getElementById("change-title-modal").addEventListener("shown.bs.modal", () => {
  modal_new_title_input.select();
});

modal_new_title_input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    document.querySelector("div.modal-footer #change").click();
  } else if (event.ctrlKey && event.code === "KeyS") {
    event.preventDefault();
    document.querySelector("div.modal-footer #change").click();
  } else {
    const title_length = modal_new_title_input.value.length;
    if (title_length == max_title_length) {
      if (String.fromCharCode(event.keyCode).match(/(\w|\s)/g)) {
        // pressed key is a char
        event.preventDefault();
      }
    }
  }
});

document.querySelector("div.modal-footer #change").addEventListener("click", () => {
  showSpinner();
  setSaveStatus('saving');
  const new_title = modal_new_title_input.value.trim();
  if (new_title === documentData.title) {
    setSaveStatus('saved');
    hideSpinner();
    return;
  }

  const document_title = document.querySelector("document-title");

  if (!new_title || new_title === "Untitled Document") {
    documentData.title = "Untitled Document";
    document_title.style.color = "tomato";
  } else {
    documentData.title = new_title;
    document_title.style.color = "var(--nmd-blue)";
  }

  document.title = documentData.title;

  // upload the new title to the server
  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}/title.json`, {
    method: "PUT",
    body: JSON.stringify(documentData.title)
  }).then(() => {
    fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}/last_visit.json`, {
      method: "PUT",
      body: JSON.stringify(getDate())
    }).then(() => {
      document_title.innerText = documentData.title;
      setSaveStatus('saved');
      hideSpinner();
    });
  });
});

function download(text, filename) {
  let element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function getHtml() {
  let html = `<div style='font-family: "${fonts[documentData.font]}"!important; font-weight: 600!important;'>${compileMarkdown(notepad.value.trimEnd())}</div>`;
  // if (documentData.type === "code") return html.substring(0, 39) + html.substring(40, html.length);
  return html;
}

document.getElementById("make-a-copy-btn").addEventListener("click", () => {
  window.location.href = `/document/copy/?id=${document_uuid}`;
});

const theme_links = {
  "default": `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/googlecode.min.css"> <!-- default style is googlecode + default -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/default.min.css">`,
  "dark": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/base16/ia-dark.min.css" disabled="disabled" title="dark" id="theme-dark">`,
  "light": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/base16/ia-light.min.css" disabled="disabled" title="dark" id="theme-light">`,
  "hopscotch": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/base16/hopscotch.min.css" disabled="disabled" title="dark" id="theme-hopscotch">`,
  "helios": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/base16/helios.min.css" disabled="disabled" title="dark" id="theme-helios">`,
  "papercolor": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/base16/papercolor-dark.min.css" disabled="disabled" title="dark" id="theme-papercolor">`,
  "solarized-light": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/base16/solarized-light.min.css" disabled="disabled" title="dark" id="theme-solarized-light">`,
  "unikitty-light": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/base16/unikitty-light.min.css" disabled="disabled" title="dark" id="theme-unikitty-light">`,
  "github": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/github.min.css" disabled="disabled" title="dark" id="theme-github">`,
  "github-dark": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/github-dark.min.css" disabled="disabled" title="dark" id="theme-github-dark">`,
  "github-dark-dimmed": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/github-dark-dimmed.min.css" disabled="disabled" title="dark" id="theme-github-dark-dimmed">`,
  "hybrid": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/hybrid.min.css" disabled="disabled" title="dark" id="theme-hybrid">`,
  "kimbie-dark": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/kimbie-dark.min.css" disabled="disabled" title="dark" id="theme-kimbie-dark">`,
  "kimbie-light": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/kimbie-light.min.css" disabled="disabled" title="dark" id="theme-kimbie-light">`,
  "monokai": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/monokai.min.css" disabled="disabled" title="dark" id="theme-monokai">`,
  "monokai-sublime": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/monokai-sublime.min.css" disabled="disabled" title="dark" id="theme-monokai-sublime">`,
  "snazzy": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/base16/snazzy.min.css" disabled="disabled" title="dark" id="theme-snazzy">`,
  "outrun-dark": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/base16/outrun-dark.min.css" disabled="disabled" title="dark" id="theme-outrun-dark">`,
  "felipec": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/felipec.min.css" disabled="disabled" title="dark" id="theme-felipec"> `,
  "mocha": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/base16/mocha.min.css" disabled="disabled" title="dark" id="theme-mocha">`,
  "rainbow": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/rainbow.min.css" disabled="disabled" title="dark" id="theme-rainbow">`,
  "nord": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/nord.min.css" disabled="disabled" title="dark" id="theme-nord">`,
  "pycharm": `<link rel="alternate stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/styles/shades-of-purple.min.css" disabled="disabled" title="dark" id="theme-pycharm"></link>`
};

document.getElementById("download-document-as-html-btn").addEventListener('click', () => {
  download(`<!DOCTYPE>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/x-icon" href="https://notes.mzecheru.com/static/notepad.png">
    <title>${documentData.title}</title>
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js" integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-ho+j7jyWK8fNQe+A12Hb8AhRq26LrZ/JpcUGGOn+Y7RsweNrtN/tE3MoK7ZeZDyx" crossorigin="anonymous"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
    <link rel="stylesheet" href="https://notes.mzecheru.com/document/edit/styles.css">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-ka7Sk0Gln4gmtz2MlQnikT1wXgYsOg+OMhuP+IlRH9sENBO0LRn5q+8nbTov4+1p" crossorigin="anonymous"></script>
    <link rel="stylesheet" href="https://notes.mzecheru.com/default.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0" />
    <script src="https://notes.mzecheru.com/modules/bootstrap-menu.js"></script>
    <script src="https://notes.mzecheru.com/modules/show_footer.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/nano.min.css"/> <!-- 'nano' theme -->
    <script src="https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/pickr.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.6.0/highlight.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlightjs-line-numbers.js/2.8.0/highlightjs-line-numbers.min.js"></script>
    <link rel="stylesheet" href="https://notes.mzecheru.com/modules/snackbar.css">
    ${theme_links[documentData.theme]}
  </head>
  <body>
  ${documentData.type === "markdown" ? '<div id="footnotes-alert-placeholder"></div>' +
    '<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">' +
      '<symbol id="info-fill" fill="currentColor" viewBox="0 0 16 16">' +
        '<path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>' +
      '</symbol>' +
    '</svg>' : ''}
    ${getHtml()}
    <script>
      document.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
        checkbox.addEventListener("click", (e) => {
          e.preventDefault();
        });
        checkbox.style.cursor = "not-allowed";
        checkbox.title = "View in Notepad MD to enable checkboxes";
      });
    </script>
    <style>
      input[type='checkbox']:active {
        filter: brightness(1)!important;
      }
     
      input[type='checkbox']:focus {
        border: 1px solid rgba(0,0,0,.25)!important;
        box-shadow: none!important;
      }
     
      *, body {
        font-family: "${fonts[documentData.font]}"!important;
        font-weight: 600;
      }
    </style>
    <a class="btn btn-primary" href="https://notes.mzecheru.com/document/?id=${document_uuid}" style="position: fixed; right: .5vw; bottom: 1vh;">View in Notepad MD</a>
    <style>
      body {
        margin-left: .5em;
        margin-right: .5em;
      }
    </style>
  </body>
  </html>`, `${documentData.title}.html`);
});

document.getElementById("download-document-as-nmd-btn").addEventListener('click', () => {
  download(getHtml(), `${documentData.title}.nmd`);
});

window.getComputedStyle = window.getComputedStyle || function(element) {
  return element.currentStyle;
}

function getStylesWithoutDefaults( element ) {

  // creating an empty dummy object to compare with
  var dummy = document.createElement( 'element-' + ( new Date().getTime() ) );
  document.body.appendChild( dummy );

  // getting computed styles for both elements
  var defaultStyles = getComputedStyle( dummy );
  var elementStyles = getComputedStyle( element );

  // calculating the difference
  var diff = {};
  for( var key in elementStyles ) {
    if(elementStyles.hasOwnProperty(key)
          && defaultStyles[ key ] !== elementStyles[ key ] )
    {
      diff[ key ] = elementStyles[ key ];
    }
  }

  // clear dom
  dummy.remove();
  return diff;
}

function addInlineStyles(ele) {
  [...ele.childNodes].filter((child) => child.toString() !== "[object Text]").forEach(child => {
    if (child.children.length) {
      addInlineStyles(child);
    }
    let styles_ = "";
    for (const [key, value] of Object.entries(getStylesWithoutDefaults(child))) {
      styles_ += `${key}:${value};`;
    }
    child.setAttribute("style", styles_);
  });
}

/* replace classes with inline styles */
document.getElementById("copy-html-btn").addEventListener('click', () => {
  new bootstrap.Modal(document.getElementById("copy-html-modal")).show();
});

document.getElementById("use-stylesheets-btn").addEventListener('click', () => {
  let html = `<!DOCTYPE>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/x-icon" href="https://notes.mzecheru.com/static/notepad.png">
    <title>${documentData.title}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous">
    <link rel="stylesheet" href="https://notes.mzecheru.com/document/edit/styles.css">
    <link rel="stylesheet" href="https://notes.mzecheru.com/default.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@simonwep/pickr/dist/themes/nano.min.css"/> <!-- 'nano' theme -->
    <link rel="stylesheet" href="https://notes.mzecheru.com/modules/snackbar.css">
    ${theme_links[documentData.theme]}
  </head>
  <body style='font-family: "${fonts[documentData.font]}"!important; font-weight: 600!important;'>
    ${getHtml()}
    <style>
      *, body {
        font-family: "${fonts[documentData.font]}"!important;
        font-weight: 600;
      }
    </style>
  </body>`;
  navigator.clipboard.writeText(html);
});

document.getElementById("use-inline-styles-btn").addEventListener('click', () => {
  document.body.style.cursor = "wait";
  document.body.style.opacity = "0.5";

  new Promise(_r => {
    setTimeout(_r, 200);
  }).then(() => {
    (async () => {
      let html = getHtml();
      let ele = document.createElement("div");
      ele.innerHTML = html;
      document.head.appendChild(ele);
      addInlineStyles(ele);
      navigator.clipboard.writeText(ele.innerHTML);
    })().then(() => {
      document.body.style.cursor = "default";
      document.body.style.opacity = "1";
    });
  });
});

document.getElementById("copy-md-btn").addEventListener('click', () => {
  navigator.clipboard.writeText(documentData.content);
});

document.getElementById("download-notepad-as-txt-btn").addEventListener('click', () => {
  download(notepad.value.trimEnd(), `${documentData.title}.txt`);
});

document.addEventListener('keydown', (e) => {
  if (!e.altKey) return;

  if (e.code === "Digit1" || (e.code === "Digit1" && e.shiftKey)) {
    e.preventDefault();
    if (NOTEPAD_DISABLED) return;
    if (doc.dataset.fullscreen === "true" ? true : false) {
      // exit fullscreen
      document.querySelector(".dropleft > span").click();
    }
    document.querySelector("main div > span").click();
  }
  
  if (e.code === "Digit2" || (e.code === "Digit2" && e.shiftKey)) {
    e.preventDefault();
    if (notepad.dataset.fullscreen === "true" ? true : false) {
      // notepad is fullscreen, so we need to exit it first
      document.querySelector("main div > span").click();
    };
    document.querySelector(".dropleft > span").click();
  }

  if (e.shiftKey && e.code === "T") {
    e.preventDefault();
    document.querySelector("document-title").click();
    return;
  }

  if (e.code === "Escape" && document.getElementById("footnotes-alert-placeholder").innerHTML !== "") {
    e.preventDefault();
    document.getElementById("footnotes-alert-placeholder").innerHTML = "";
    return;
  }

  if (e.code === "Escape" && doc.dataset.fullscreen === "true" ? true : false) {
    e.preventDefault();
    document.querySelectorAll("span.fullscreen")[1].click();
    notepad.focus();
    return;
  }

  if (e.ctrlKey && e.shiftKey && e.code === "KeyP") {
    e.preventDefault();
    new bootstrap.Modal(document.getElementById("word-count-modal")).show();
    return;
  }
});

doc.addEventListener('keydown', (e) => {
  if (e.code === "Escape" && document.getElementById("footnotes-alert-placeholder").innerHTML !== "") {
    e.preventDefault();
    document.getElementById("footnotes-alert-placeholder").innerHTML = "";
    return;
  }
  
  if (e.code === "Escape" && doc.dataset.fullscreen === "true" ? true : false) {
    e.preventDefault();
    document.querySelectorAll("span.fullscreen")[1].click();
    notepad.focus();
    return;
  }

  if (e.ctrlKey && e.shiftKey && e.code === "KeyP") {
    e.preventDefault();
    new bootstrap.Modal(document.getElementById("word-count-modal")).show();
    return;
  }

  if (e.ctrlKey && e.shiftKey && e.code === "KeyF") {
    e.preventDefault();
    new bootstrap.Modal(document.getElementById("search-modal")).show();
  }

  if (e.ctrlKey && e.code === "KeyA") {
    e.preventDefault();
    // clear the current selection
    const selection = window.getSelection();
    selection.removeAllRanges();

    // select doc
    const range = document.createRange();
    range.selectNodeContents(doc);
    selection.addRange(range);
  }
});

/* notepad fullscreen - Alt+1 */

document.querySelector("main div > span").addEventListener('click', () => {
  if (NOTEPAD_DISABLED) return;
  const notepad_fullscreen = notepad.dataset.fullscreen === "true" ? true : false;

  if (!notepad_fullscreen) {
    notepad.style.position = "fixed";
    notepad.style.width = "98.75vw";
    notepad.style.height = "calc(95vh - 2.8em)";
    notepad.style.zIndex = "1000";
    notepad.style.display = "block";
    doc.style.display = "none";

    document.querySelector("main div > span").innerText = "fullscreen_exit";
    document.getElementById("footer").style.visibility= "hidden";
    document.getElementById("dotted-line").style.visibility= "hidden";
    
    notepad.dataset.fullscreen = true;
    notepad.focus();
  } else {
    notepad.style.position = "relative";
    notepad.style.width = "100%";
    notepad.style.height = "calc(100% - 5vh)";
    notepad.style.zIndex = "0";
    notepad.style.display = "block";
    doc.style.display = "block";
    
    document.querySelector("main div > span").innerText = "fullscreen";
    document.getElementById("footer").style.visibility= "visible";
    document.getElementById("dotted-line").style.visibility= "visible";
    
    notepad.dataset.fullscreen = false;
    notepad.focus();
  }
});

/* doc fullscreen - Alt+2 */

let doc_fullscreen_previous_styles = {};
document.querySelector(".dropleft > span").addEventListener('click', () => {
  const doc_fullscreen = doc.dataset.fullscreen === "true" ? true : false;
  const notepad_fullscreen = notepad.dataset.fullscreen === "true" ? true : false;
  
  if (notepad_fullscreen) {
    // notepad is fullscreen, so we need to exit it first
    document.querySelector("main div > span").click();
  };

  if (!doc_fullscreen) {
    doc.style.position = "absolute";
    doc.style.top = "0";
    doc.style.left = "0";
    doc.style.width = "100vw";
    doc.style.height = "95vh";
    notepad.style.display = "none";
    doc.style.display = "block";

    const fullscreen_box = document.querySelector(".dropleft > span");
    doc_fullscreen_previous_styles = JSON.parse(JSON.stringify(fullscreen_box.style));
    fullscreen_box.innerText = "fullscreen_exit";
    fullscreen_box.style.position = "fixed";
    fullscreen_box.style.top = "1vh";
    fullscreen_box.style.right = "1.25vw";
    fullscreen_box.style.float = "right";
    fullscreen_box.style.zIndex = "1000";
    
    // prevent text from going all the way to the right edge; prevents overlap with the fullsreen_box
    doc.style.paddingRight = `calc(${doc.offsetWidth - doc.clientWidth}px + 1.25vw + ${fullscreen_box.clientWidth}px)`;

    // delete alert if it exists
    document.getElementById("footnotes-alert-placeholder").innerHTML = "";
    doc.dataset.fullscreen = true;
    notepad.blur();
    doc.tabIndex = 100;
    doc.focus();
    doc.tabIndex = -1;
  } else {
    doc.style.position = "relative";
    doc.style.top = "";
    doc.style.width = "100%";
    doc.style.height = "calc(100% - 3.13vh)";
    doc.style.zIndex = "0";
    doc.style.paddingRight = "";
    notepad.style.display = "block";
    doc.style.display = "block";
    
    const fullscreen_box = document.querySelector(".dropleft > span");
    fullscreen_box.innerText = "fullscreen";
    fullscreen_box.style = doc_fullscreen_previous_styles;
    
    // delete alert if it exists
    document.getElementById("footnotes-alert-placeholder").innerHTML = "";
    doc.dataset.fullscreen = false;
    doc.blur();
    notepad.focus();
  }
});

// minimize doc, fixes bug where on code mode the page opens with the doc in fullscreen
for (let i = 0; i < 2; i++) document.querySelector(".dropleft > span").click();

document.body.addEventListener('keydown', (e) => {
  if (e.code === "Escape" && document.getElementById("footnotes-alert-placeholder").innerHTML !== "") {
    e.preventDefault();
    document.getElementById("footnotes-alert-placeholder").innerHTML = "";
    return;
  }

  // title
  if (e.altKey && e.shiftKey && e.code === "KeyT") {
    modal_new_title_input.value = documentData.title;
    new bootstrap.Modal(document.getElementById("change-title-modal")).show();
    return;
  }

  // escape
  if (e.code === "Escape" && doc.dataset.fullscreen === "true" ? true : false) {
    e.preventDefault();
    document.querySelectorAll("span.fullscreen")[1].click();
    notepad.focus();
    return;
  }

  // document settings
  if (e.ctrlKey && e.altKey && e.code === "KeyS" && documentData.owner.replace(/,/g, ".") === email.replace(/,/g, ".")) {
    document.getElementById("settings").click();
    return;
  }

  if (e.ctrlKey && e.shiftKey && e.code === "KeyF") {
    e.preventDefault();
    new bootstrap.Modal(document.getElementById("search-modal")).show();
    return;
  }

  if (e.key === "Tab") {
    e.preventDefault();
    notepad.focus();
    return;
  }

  // document summary
  if (e.ctrlKey && e.shiftKey && e.code === "KeyP") {
    e.preventDefault();
    const clean = string => {
      const alphabet = string.replace(/[^A-Za-z']+/g, " ").trim();
      const lowerCase = alphabet.toLowerCase();
      return lowerCase;
    }
    
    const text = doc.innerText || clean(notepad.value);
    const character_count = text.replace(/\n/g, " ").length;

    const wordOccurrence = string => {
      let map = {};
      const words = string.replace(/\n/g, " ").replace(/\./g, " ").replace(/,/g, " ").split(" ").map(word => word.replace(/\./g, " ").replace(/,/g, " ").toLowerCase().trim()).filter(word => word !== "" && isNaN(word));

      for (let i = 0; i < words.length; i++) {
        const item = words[i];
        map[item] = (map[item] + 1) || 1;
      }
  
      function compareNumeric(a, b) {
        if (a > b) return 1;
        if (a == b) return 0;
        if (a < b) return -1;
      }

      return { total_words: words.length, indiv_words_count: Object.entries(map).sort((a, b) => compareNumeric(b[1], a[1])) };
    }

    const { total_words, indiv_words_count } = wordOccurrence(text);
    let expand_level = 1;

    const sentences = text.split(".").map(sentence => sentence.replace(/\n/g, " ")).filter(sentence => sentence.trim().length >= 7);
    const sentence_count = sentences.length;
    const avg_words_per_sentence = (total_words / sentences.length).toFixed(2);
    document.getElementById("word-count-modal-body").innerHTML = `
      <p class="text-center">Total Characters: . . . . . . . . . . . &nbsp;${character_count}</p>
      <p class="text-center">Total Words: . . . . . . . . . . . . . . . . ${total_words}</p>
      <p class="text-center">Total Sentences: . . . . . . . . . . . ${sentence_count}</p>
      <p class="text-center">Average Words Per Sentence: ${avg_words_per_sentence}</p>
      <p class="text-center"><u>Most Common Words</u></p>
      <ul class="list-group">
        ${indiv_words_count.slice(0, expand_level * 50).map((word, index) => `<li class="list-group-item">${index + 1}. ${word[0]} (${word[1]})</li>`).join("")}
        <li class="list-group-item" id="word-count-modal-more-btn"><center>. . .</center></li>
      </ul>
    `;

    function expand() {
      expand_level++;
      document.getElementById("word-count-modal-body").innerHTML = `
      <p class="text-center">Total Characters: . . . . . . . . . . . &nbsp;${character_count}</p>
      <p class="text-center">Total Words: . . . . . . . . . . . . . . . . ${total_words}</p>
      <p class="text-center">Total Sentences: . . . . . . . . . . . ${sentence_count}</p>
      <p class="text-center">Average Words Per Sentence: ${avg_words_per_sentence}</p>
      <p class="text-center"><u>Most Common Words</u></p>
      <ul class="list-group">
      ${indiv_words_count.slice(0, expand_level * 50).map((word, index) => `<li class="list-group-item">${index + 1}. ${word[0]} (${word[1]})</li>`).join("")}
      <li class="list-group-item" id="word-count-modal-more-btn"><center>. . .</center></li>
      </ul>
      `;
      document.getElementById("word-count-modal-more-btn").addEventListener('click', expand);
    }
    
    document.getElementById("word-count-modal-more-btn").addEventListener('click', expand);

    new bootstrap.Modal(document.getElementById("word-count-modal")).show();
    return;
  }

  // print
  if (e.ctrlKey && e.code === "KeyP") {
    e.preventDefault();
    _print("document");
  }
});

window.onbeforeunload = () => {
  if (notepad.value.trimEnd() !== "" && document.getElementById("save-status").innerText !== "No New Changes") {
    return "Are you sure you want to leave? Your changes will not be saved.";
  }
}

function showSnackBar() {
  var sb = document.getElementById("snackbar");
  sb.className = "show";
  setTimeout(()=>{ sb.className = sb.className.replace("show", ""); }, 3000);
}

document.getElementById("copy-share-link-btn").addEventListener('click', () => {
  new bootstrap.Modal(document.getElementById("share-link-modal")).show();
});

function setGreen(ele) {
  switch (ele.id) {
    case "share-view-link":
      document.getElementById("share-view-link").classList.remove("btn-secondary");
      document.getElementById("share-view-link").classList.add("btn-primary");
      document.getElementById("share-edit-link").classList.remove("btn-primary");
      document.getElementById("share-edit-link").classList.add("btn-secondary");
      document.getElementById("share-copy-link").classList.remove("btn-primary");
      document.getElementById("share-copy-link").classList.add("btn-secondary");
      break;

    case "share-edit-link":
      document.getElementById("share-view-link").classList.remove("btn-primary");
      document.getElementById("share-view-link").classList.add("btn-secondary");
      document.getElementById("share-edit-link").classList.remove("btn-secondary");
      document.getElementById("share-edit-link").classList.add("btn-primary");
      document.getElementById("share-copy-link").classList.remove("btn-primary");
      document.getElementById("share-copy-link").classList.add("btn-secondary");
      break;

    case "share-copy-link":
      document.getElementById("share-view-link").classList.remove("btn-primary");
      document.getElementById("share-view-link").classList.add("btn-secondary");
      document.getElementById("share-edit-link").classList.remove("btn-primary");
      document.getElementById("share-edit-link").classList.add("btn-secondary");
      document.getElementById("share-copy-link").classList.remove("btn-secondary");
      document.getElementById("share-copy-link").classList.add("btn-primary");
      break;
  }
}

document.getElementById("share-view-link").addEventListener('click', () => {
  document.getElementById("share-link-input").value = `https://notes.mzecheru.com/document/view/?id=${document_uuid}`;
  setGreen(document.getElementById("share-view-link"));
  document.getElementById("share-view-link").blur();
});

document.getElementById("share-edit-link").addEventListener('click', () => {
  document.getElementById("share-link-input").value = `https://notes.mzecheru.com/document/edit/?id=${document_uuid}`;
  setGreen(document.getElementById("share-edit-link"));
  document.getElementById("share-edit-link").blur();
});

document.getElementById("share-copy-link").addEventListener('click', () => {
  document.getElementById("share-link-input").value = `https://notes.mzecheru.com/document/copy/?id=${document_uuid}`;
  setGreen(document.getElementById("share-copy-link"));
  document.getElementById("share-copy-link").blur();
});

document.getElementById("copy-share-link").addEventListener('click', () => {
  if (document.getElementById("share-link-input").value) {
    navigator.clipboard.writeText(document.getElementById("share-link-input").value);
    showSnackBar();
  }
  document.getElementById("copy-share-link").blur(); 
});

document.getElementById("word-count-modal").addEventListener('hidden.bs.modal', () => {
  document.querySelector("div.modal-backdrop.show")?.remove();
});

// update order of documents
if (JSON.parse(getCookie("documents")).includes(document_uuid)) {
  const documents = JSON.parse(getCookie("documents"));
  documents.splice(documents.indexOf(document_uuid), 1);
  documents.push(document_uuid);
  setCookie("documents", JSON.stringify(documents), 365);
}

document.getElementById("change-bold-text-color-confirm-button").addEventListener('click', () => {
  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/configurations/${document_uuid}/${JSON.parse(getCookie('nmd-validation')).email.replace(/\./g, ",")}/bold_color.json`, { 
    method: "PUT",
    body: JSON.stringify(BOLD_COLOR)
  }).then(res => res.json());
  document.querySelectorAll("#document b").forEach(_b => {
    _b.style.color = BOLD_COLOR.startsWith('#') ? BOLD_COLOR : `rgb(${BOLD_COLOR})`;
  });
});

document.querySelectorAll(".circle-picker span > div > span > div").forEach(_ele => {
  _ele.addEventListener('click', () => {
    const rgb = _ele.style.boxShadow.substring(4, _ele.style.boxShadow.length - 24);
    BOLD_COLOR = rgb;
    document.querySelectorAll(".circle-picker span > div > span > div").forEach(__ele => {
      __ele.style.border = "none";
    });
    _ele.style.border = ".2em solid #000";
  });
});

function _print() {
  // delete alert if it's open
  document.getElementById("footnotes-alert-placeholder")?.remove();
  let printContents = compileMarkdown(documentData.content);
  // if (documentData.type === "code") {
  //   printContents = printContents.substring(0, 39) + printContents.substring(40, printContents.length);
  // }
  document.body.innerHTML = printContents;;
  document.body.style.fontWeight = "600";
  document.body.style.fontFamily = documentData.font;
  const _e_ = document.createElement("style");
  _e_.innerHTML = BOLD_COLOR.startsWith('#') ? `b { color: ${BOLD_COLOR}; }` : `b { color: rgb(${BOLD_COLOR}); }` + `mark { color: yellow; }`;  
  document.body.appendChild(_e_);
  window.print();
  window.location.reload();
}

document.getElementById("print-document-btn").addEventListener('click', _print);

document.getElementById('file-upload-modal-confirm-btn').addEventListener('click', () => {
  for (var i = 0, f; f = window.files[i]; i++) {
    const reader = new FileReader();
    reader.readAsText(f);
    
    reader.onload = () => {
      document.getElementById('notepad').value = reader.result;
      saveDocument();
    }
  }
});

/* drag and drop image / video */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-app.js';
import { ref, getStorage, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyCYatodI_Ps_C9Dl6HIo0tZTprwLdApCw8",
  authDomain: "notepad-md-32479.firebaseapp.com",
  databaseURL: "https://notepad-md-32479-default-rtdb.firebaseio.com",
  projectId: "notepad-md-32479",
  storageBucket: "notepad-md-32479.appspot.com",
  messagingSenderId: "172344421800",
  appId: "1:172344421800:web:5ea093a073ed4b748dc19d",
  measurementId: "G-TY1F0SJL34"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage();

function showFileUploadProgressModal() {
  /*
    <div class="modal fade" tabindex="-1" id="file-upload-progress-modal" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Uploading File</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" id="file-upload-progress-modal-close-button"></button>
          </div>
          <div class="modal-body">
            Your file is being uploaded to the database.<br><br>

            Current progress: <mark><span id="file-upload-progress-modal-progress">0</span>%</mark>
          </div>
        </div>
      </div>
    </div>
  */
  let _modal = document.createElement("div");
  _modal.classList.add("modal", "fade");
  _modal.setAttribute("tabindex", "-1");
  _modal.setAttribute("id", "file-upload-progress-modal");
  _modal.setAttribute("aria-hidden", "true");
  _modal.setAttribute("data-bs-backdrop", "static");
  _modal.setAttribute("data-bs-keyboard", "false");
  _modal.innerHTML = `
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Uploading Image</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" id="file-upload-progress-modal-close-button"></button>
      </div>
      <div class="modal-body">
        Your file is being uploaded to the database.<br><br>

        Current progress: <mark><span id="file-upload-progress-modal-progress">0</span>%</mark>
      </div>
    </div>
  </div>`;
  document.body.appendChild(_modal);
  new bootstrap.Modal(document.getElementById("file-upload-progress-modal")).show();
}

function insertAtCursor(ele, value) {
  value += "\n";
  // Internet Explorer
  if (document.selection) {
    ele.focus();
    sel = document.selection.createRange();
    sel.text = value;
  }
  // Mozilla and Webkit
  else if (ele.selectionStart || ele.selectionStart == '0') {
    var startPos = ele.selectionStart;
    var endPos = ele.selectionEnd;
    document.execCommand('selectAll', false);
    var el = document.createElement('p');
    el.innerText = ele.value.substring(0, startPos)
      + value
      + ele.value.substring(endPos, ele.value.length);
    document.execCommand('insertHTML', false, el.innerHTML);
  } else {
    ele.value += value;
  }
}

window.files = [];

notepad.addEventListener("dragover", (event) => {
  event.preventDefault();
});

notepad.addEventListener('drop', (event) => {
  event.stopPropagation(); 
  event.preventDefault();
  window.files = event.dataTransfer.files;

  if (!window.files.length) return;

  if (window.files.length > 1) {
    new bootstrap.Modal(document.getElementById("only-one-file-upload-modal")).show();
    return;
  }

  const file = files[0];
  const fileRef = ref(storage, `${file.name}`);

  if (file.type.startsWith("image/")) {
    // upload the image to the firestore

    showFileUploadProgressModal();
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on('state_changed', (snapshot) => {
      const progress = ((snapshot.bytesTransferred / snapshot.totalBytes) * 100).toFixed(2);
      document.getElementById("file-upload-progress-modal-progress").innerText = progress;
    }, (error) => {
      document.getElementById("file-upload-progress-modal-close-button").click();
      new bootstrap.Modal(document.getElementById("file-upload-error-modal")).show();
    }, () => {
      getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
        const image = `![${file.name}](${downloadURL})`;
        insertAtCursor(notepad, image);
        // 250ms delay
        new Promise(__r => {
          setTimeout(() => {
            document.getElementById("file-upload-progress-modal-close-button").click();
            notepad.dispatchEvent(new KeyboardEvent('keydown', { 'code': 'KeyS', ctrlKey: true }));
            __r();
          }, 250);
        });
      });
    });
  } else if (file.type.startsWith("video/") && JSON.parse(getCookie("nmd-validation")).email === "zecheruchris@gmail.com") {
    // upload the video to the firestore
    showFileUploadProgressModal();
    const uploadTask = uploadBytesResumable(fileRef, file);
    uploadTask.on('state_changed', (snapshot) => {
      const progress = ((snapshot.bytesTransferred / snapshot.totalBytes) * 100).toFixed(2);
      document.getElementById("file-upload-progress-modal-progress").innerText = progress;
    }, (error) => {
      document.getElementById("file-upload-progress-modal-close-button").click();
      new bootstrap.Modal(document.getElementById("file-upload-error-modal")).show();
    }, () => {
      getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
        const video = `$[${file.name}](${downloadURL})`;
        insertAtCursor(notepad, video);
        // 250ms delay
        new Promise(__r => {
          setTimeout(() => {
            document.getElementById("file-upload-progress-modal-close-button").click();
            notepad.dispatchEvent(new KeyboardEvent('keydown', { 'code': 'KeyS', ctrlKey: true }));
            __r();
          }, 250);
        });
      });
    });
  } else if (file.type.startsWith("text/")) {
    // notify use that uploading the file will override their document's current text
    new bootstrap.Modal(document.getElementById('file-upload-modal')).show();
  }
});

const tagInput = document.querySelector('#input');
const form = document.querySelector(".tag-form");
const tagContainer = document.querySelector('.tag-container');
let tags = [];

const createTag = (tagValue) => {
  const value = tagValue.trim();

  const email_regex = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
  if (!value.match(email_regex)) {
    tagInput.style.transition = "all 0.2s ease-in-out";
    tagInput.style.transform = "scale(1.05)";
    new Promise(_r => {
      setTimeout(() => {
        tagInput.style.transform = "scale(1)";
      }, 200);
    });
    return;
  }

  if (value === '' || tags.includes(value)) return;

  const tag = document.createElement('span');
  const tagContent = document.createTextNode(value);
  tag.setAttribute('class', 'tag-tag btn btn-secondary');
  tag.appendChild(tagContent);

  const close = document.createElement('span');
  close.setAttribute('class', 'remove-tag disable-highlighting');
  close.innerHTML = '&#10006;';
  close.onclick = handleRemoveTag;
  tag.appendChild(close);

  if (!tags.includes(tag)) {
    tagContainer.appendChild(tag);
    tags.push(tag);
  }

  tagInput.value = '';
  tagInput.focus();
};

const handleRemoveTag = (e) => {
  const item = e.target.textContent;
  if (e.target.parentElement.innerText.replace(/✖/g, "") === documentData.owner.replace(/,/g, ".") || documentData.owner.replace(/,/g, ".") !== email.replace(/,/g, ".")) {
    e.target.parentElement.style.transition = "all 0.2s ease-in-out";
    e.target.parentElement.style.transform = "scale(1.1)";
    new Promise(_r => {
      setTimeout(() => {
        e.target.parentElement.style.transform = "scale(1)";
        _r();
      }, 200);
    });
    return;
  }

  e.target.parentElement.remove();
  tags.splice(tags.indexOf(item), 1);

  documentData.authors.splice(documentData.authors.indexOf(e.target.parentElement.innerText), 1);
};

const handleFormSubmit = (e) => {
  e.preventDefault();
  createTag(tagInput.value);
};

tagInput.addEventListener('keyup', (e) => {
    if (e.key === ',' || e.key === " ") {
      createTag(tagInput.value.substring(0, tagInput.value.length - 1));
    }
});

form.addEventListener('submit', handleFormSubmit);
const settingsModalDocumentDescriptionCharacterCounter = document.getElementById("settings-modal-document-description-character-counter");
const description_box_character_limit = 500;

document.getElementById("settings").addEventListener('click', () => {
  // only allow the owner to edit the document settings
  if (documentData.owner.replace(/,/g, ".") !== email.replace(/,/g, ".")) return;

  saveDocument();
  let eles = [];

  const title_ele = document.getElementById("settings-modal-document-title");
  title_ele.value = documentData.title;
  eles.push(title_ele);

  const description_ele = document.getElementById("settings-modal-document-description");
  description_ele.value = documentData.description || "";
  settingsModalDocumentDescriptionCharacterCounter.innerText = description_box_character_limit - description_ele.value.length;
  eles.push(description_ele);
  
  const visibility_ele = document.getElementById("settings-modal-document-visibility");
  visibility_ele.value = documentData.visibility || "public";
  eles.push(visibility_ele);

  const type_ele = document.getElementById("settings-modal-document-type");
  type_ele.value = documentData.type || "markdown";
  eles.push(type_ele);

  const language_ele = document.getElementById("settings-modal-document-language");
  language_ele.value = documentData.language || "en";
  eles.push(language_ele);

  const theme_ele = document.getElementById("settings-modal-document-theme");
  theme_ele.value = documentData.theme || "default";
  eles.push(theme_ele);

  const font_ele = document.getElementById("settings-modal-document-font");
  font_ele.value = documentData.font || "comfortaa";
  eles.push(font_ele);

  const font_size_ele = document.getElementById("settings-modal-document-font-size");
  font_size_ele.value = documentData.fontSize || 16;
  eles.push(font_size_ele);

  const font_size_label_ele = document.getElementById("settings-modal-document-font-size-label");
  font_size_label_ele.innerText = documentData.fontSize || 16;

  const indent_size_ele = document.getElementById("settings-modal-document-indent-size");
  indent_size_ele.value = documentData.indentSize || 8;
  eles.push(indent_size_ele);

  const indent_size_label_ele = document.getElementById("settings-modal-document-indent-size-label");
  indent_size_label_ele.innerText = documentData.indentSize || 8;

  eles.push(document.getElementById("settings-modal-document-authors"));
  eles.push(document.getElementById("settings-modal"));

  [...new Set([ ...documentData.authors, documentData.owner.replace(/,/g, ".") ])].forEach(createTag);

  eles.forEach(ele => {
    ele?.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.code === "KeyS") {
        e.preventDefault();
        document.getElementById("settings-modal-save-btn").click();
      }
      
      const ids = ["settings-modal-document-indent-size", "settings-modal-document-font-size", "settings-modal-document-title"];
      
      if (ids.includes(ele.id) && e.code === "Enter") {
        e.preventDefault();
        document.getElementById("settings-modal-save-btn").click();
      }
    });
  });

  new bootstrap.Modal(document.getElementById("settings-modal")).show();
});

document.getElementById("settings-modal").addEventListener("hidden.bs.modal", () => {
  saveDocument().then(() => {
    window.location.reload();
  });
});

document.getElementById("settings-modal").addEventListener("shown.bs.modal", () => {
  document.getElementById("settings-modal-document-title").select();
});

document.getElementById("settings-modal-save-btn").addEventListener('click', () => {
  LINE_NUMBERS_ENABLED = document.getElementById("line-numbers-switch").checked;
  documentData.title = document.getElementById("settings-modal-document-title").value;
  documentData.description = document.getElementById("settings-modal-document-description").value;
  documentData.visibility = document.getElementById("settings-modal-document-visibility").value;
  documentData.type = document.getElementById("settings-modal-document-type").value;
  documentData.language = document.getElementById("settings-modal-document-language").value;
  documentData.theme = document.getElementById("settings-modal-document-theme").value;
  documentData.font = document.getElementById("settings-modal-document-font").value;
  documentData.fontSize = parseInt(document.getElementById("settings-modal-document-font-size").value);
  documentData.indentSize = parseInt(document.getElementById("settings-modal-document-indent-size").value);
  documentData.authors = [...new Set((tags.map(tag => tag.innerText.replace(/,/g, ".").replace(/✖/g, ""))))];
  tags = [...new Set(tags)];
  saveDocument().then(() => {
    saveSettings().then(() => {
      window.location.reload();
    });
  });
});

document.getElementById("settings-modal-document-description").addEventListener('input', (e) => {
  const remainingChars = description_box_character_limit - e.target.value.length;
  if (remainingChars < 0) {
    e.target.value = e.target.value.substring(0, description_box_character_limit);
    settingsModalDocumentDescriptionCharacterCounter.innerText = 0;
    return;
  }
  settingsModalDocumentDescriptionCharacterCounter.innerText = remainingChars;
});

// add "line-numbers" toggle switch to settings menu
document.getElementById("settings-modal-document-type").addEventListener('change', (e) => {
  if (e.target.value === "code") {
    document.getElementById("line-numbers-switch").checked = LINE_NUMBERS_ENABLED;
    document.getElementById("line-numbers-toggle").style.display = "block";
  } else {
    document.getElementById("line-numbers-toggle").style.display = "none";
  }
});

document.getElementById("search-modal").addEventListener("hidden.bs.modal", () => {
  document.getElementById("search-input").value = "";
  document.getElementById("replace-input").value = "";
  document.querySelector(".modal-backdrop.fade.show")?.remove();
  notepad.focus();
});

// initialize popovers
[...document.querySelectorAll('[data-bs-toggle="popover"]')].forEach(el => new bootstrap.Popover(el))

document.getElementById("search-modal").addEventListener("shown.bs.modal", () => {
  document.getElementById("search-input").focus();
});

document.getElementById("search-input").addEventListener('keydown', (e) => {
  if (e.code === "Enter") {
    e.preventDefault();
    document.getElementById("replace-button").click();
  }

  if (e.code === "Tab") {
    e.preventDefault();
    new Promise(_r => {
      setTimeout(_r, 1);
    }).then(() => {
      if (e.shiftKey) {
        document.getElementById("close-search-bottom-btn").focus();
      } else {
        document.getElementById("replace-input").focus();
      }
    })
  }
});

document.getElementById("replace-input").addEventListener('keydown', (e) => {
  if (e.code === "Enter") {
    e.preventDefault();
    document.getElementById("replace-button").click();
  }

  if (e.code === "Tab") {
    e.preventDefault();
    new Promise(_r => {
      setTimeout(_r, 1);
    }).then(() => {
      if (e.shiftKey) {
        document.getElementById("search-input").focus();
      } else {
        document.getElementById("replace-button").focus();
      }
    });
  }
});

document.getElementById("replace-button").addEventListener('keydown', (e) => {
  if (e.code === "Enter") {
    e.preventDefault();
    document.getElementById("replace-button").click();
  }

  if (e.code === "Tab") {
    e.preventDefault();
    new Promise(_r => {
      setTimeout(_r, 1);
    }).then(() => {
      if (e.shiftKey) {
        document.getElementById("replace-input").focus();
      } else {
        document.getElementById("close-search-bottom-btn").focus();
      }
    });
  }
});

document.getElementById("close-search-bottom-btn").addEventListener('keydown', (e) => {
  if (e.code === "Enter") {
    e.preventDefault();
    document.getElementById("close-search-bottom-btn").click();
  }

  if (e.code === "Tab") {
    e.preventDefault();
    new Promise(_r => {
      setTimeout(_r, 1);
    }).then(() => {
      if (e.shiftKey) {
        document.getElementById("replace-button").focus();
      } else {
        document.getElementById("search-input").focus();
      }
    });
  }
});

document.getElementById("replace-button").addEventListener('click', () => {
  const search = document.getElementById("search-input").value;
  const replace = document.getElementById("replace-input").value;
  document.getElementById("replace-button").blur();
  if (search === "") {
    document.getElementById("search-input").focus();
    return;
  } else if (replace === "") {
    document.getElementById("replace-input").focus();
    return;
  }
  notepad.value = notepad.value.replaceAll(search, replace);
  setSaveStatus("not-saved");
  document.getElementById("close-search-btn").click();
});

// Run the javascript program written in the editor (will also run with ctrl+q)
document.getElementById("run-code-btn").addEventListener('click', () => {
  // save before running the program
  saveDocument();
  
  // run code and show output in modal
  const modal = document.getElementById("run-code-output-modal");
  try {
    // add spinner animation to modal popup
    modal.querySelector(".modal-title").querySelector(".spinner-border").classList.remove("visually-hidden");

    // focus the close button for quick exit
    new Promise((r) => {
      setTimeout(() => {
        modal.querySelector(".close-btn").focus(); r();
      }, 500);
    });

    // open empty modal
    new bootstrap.Modal(modal).show();

    // run code and show output to modal
    modal.querySelector(".modal-body").innerText = eval(notepad.value);
  } catch (e) {
    // show error to modal
    if (modal.querySelector(".modal-body").innerHTML.length) {
      // if previous output exists, add a line break and then show the error
      modal.querySelector(".modal-body").innerHTML += `<br><hr><br><p>${e}</p>`;
    } else {
      modal.querySelector(".modal-body").innerHTML = `<p>${e}</p>`;
    }
  };

  // remove spinner animation as code is done running
  document.getElementById("run-code-output-modal").querySelector(".spinner-border").classList.add("visually-hidden");
});

document.getElementById("run-code-output-modal").addEventListener("hidden.bs.modal", () => {
  document.getElementById("run-code-output-modal").querySelector(".spinner-border").classList.add("visually-hidden");
  document.querySelector(".modal-backdrop.fade.show")?.remove();
  document.getElementById("run-code-output-modal").querySelector(".modal-body").innerHTML = "";
  notepad.focus();
});
