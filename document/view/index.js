'use strict';

import { getCookie, setCookie } from "../../modules/cookies.mjs";
import { max_title_length } from "../../modules/max_lengths.mjs";
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

function get_footnote_ids(value) {
  const footnotes = [...new Set(value.match(/\[\^(\d{1,5})\]/g))];
  if (!footnotes) return [];
  return footnotes.map(x => x.match(/\d{1,5}/)[0]);
}

function get_footnote_count(value) {
  const footnotes_ = {};
  const footnotes = value.match(/\[\^(\d{1,5})\]/g);
  footnotes?.forEach((footnote, i) => {
    footnotes_[footnote] = (footnotes_[footnote] || 0) + 1;
    if (footnotes_[footnote] > 2) footnotes_[footnote] = 2;
  })
  const sumValues = obj => Object.values(obj).reduce((a, b) => a + b);
  if (!footnotes) return 0;
  return Math.ceil(sumValues(footnotes_) / 2);
}

const doc = document.getElementById("document");

// get the document uuid
const document_uuid = parameters.get('id');
if (!document_uuid) window.location.href = "/account/me/documents/?error=missing_id&id=" + document_uuid;

const email = JSON.parse(getCookie("nmd-validation")).email.replace(/\./g, ",");

async function saveSettings(update_line_numbers_enabled = true) {
  if (update_line_numbers_enabled) {
    await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/configurations/${document_uuid}/line_numbers.json`, {
      method: 'PUT',
      body: JSON.stringify(LINE_NUMBERS_ENABLED)
    }).then(res => res.json());
  }
  await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}.json`, {
    method: 'PUT',
    body: JSON.stringify(documentData)
  });
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
            document.querySelector(`.circle-picker > span > div > span > div[style*='box-shadow: rgb(${BOLD_COLOR})]`).click();
            new bootstrap.Modal(document.getElementById("change-bold-text-color-modal")).show();
          }
        }]
      });
    });
  });
}

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

  if (documentData.visibility !== "public" && documentData.owner.replace(/,/g, ".") !== email.replace(/,/g, ".")) {
    window.location.href = "/account/me/documents/?error=private_document";
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

  // add font to document, has to be done through style tag to get all children of #document
  let _style = document.createElement("style");
  _style.innerHTML = `#document *, #document { font-family: "${fonts[documentData.font]}"!important; }`;
  document.head.appendChild(_style);

  if (documentData.type !== "code") {
    doc.style.fontSize = documentData.fontSize + 'px';
  }

  document.getElementById("owner-display").innerText = documentData.owner.replace(/,/g, ".");
  if (documentData.owner.replace(/,/g, ".") === email.replace(/,/g, ".")) {
    var css = 'document-title:hover { text-decoration: underline; cursor: pointer; }';
    var style = document.createElement('style');

    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }

    document.getElementsByTagName('head')[0].appendChild(style);
  }

  let html = compileMarkdown(documentData.content);
  
  // if (documentData.type === "code") {
  //   html = html.substring(0, 39) + html.substring(40, html.length);
  // }
  
  doc.innerHTML = `${documentData.type === "markdown" ? '<div id="footnotes-alert-placeholder"></div>' : ''}</div>${html || ""}`;
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

  if (documentData.type === "markdown") {
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
  document.title = documentData.title;
  title_ele.style.fontWeight = "550";

  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}/last_visit.json`, {
    method: "PUT",
    body: JSON.stringify(getDate())
  });

  // add bold contextmenu event listeners
  addBoldEventListeners();
});

doc.focus();


function uuid4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function compileMarkdown(text) {
  // create a unique id for each set of footnotes in the document
  const footnote_ids = get_footnote_ids(text);
  let footnote_uuids = {};
  for (let i = 0; i < get_footnote_count(text); i++) {
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
    .replace(/<\/ol><br>/g, "</ol><br>")

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
  }
}

async function updateCheckbox(email, element_id, status) {
  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/checkboxes/${document_uuid}/${email}/${element_id}.json`, {
    method: "PUT",
    body: JSON.stringify(status ? 1 : 0)
  });
}

document.body.addEventListener("keypress", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    doc.focus();
  }
});

document.addEventListener("keypress", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    doc.focus();
  }
});

const modal_new_title_input = document.querySelector("div.modal-body > form > div.mb-3 > input");

document.querySelector("document-title").addEventListener("click", () => {
  if (documentData.owner.replace(/,/g, ".") !== email.replace(/,/g, ".")) return;
  modal_new_title_input.value = documentData.title;
  new bootstrap.Modal(document.getElementById("change-title-modal")).show();
  new Promise((_r) => setTimeout(_r, 500)).then(() => modal_new_title_input.select());
});

modal_new_title_input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
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
  const new_title = modal_new_title_input.value.trim();
  if (new_title === documentData.title) return;

  const document_title = document.querySelector("document-title");
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
  let html = `<div style='font-family: "${fonts[documentData.font]}"; font-weight: 600;'>${compileMarkdown(documentData.content)}</div>`;
  // if (documentData.type === "code") return html.substring(0, 39) + html.substring(40, html.length);
  return html;
}

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
    <link rel="stylesheet" href="https://notes.mzecheru.com/document/styles.css">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-ka7Sk0Gln4gmtz2MlQnikT1wXgYsOg+OMhuP+IlRH9sENBO0LRn5q+8nbTov4+1p" crossorigin="anonymous">
    </script><link rel="stylesheet" href="../default.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0">
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/google/code-prettify@master/loader/prettify.css">
    <script src="https://notes.mzecheru.com/modules/show_footer.js"></script>
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
        margin-left: 1em;
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
  download(documentData.content, `${documentData.title}.txt`);
});

document.addEventListener('keydown', (e) => {
  if (!e.altKey) return;

  if (e.shiftKey && e.code === "T") {
    e.preventDefault();
    if (documentData.owner.replace(/,/g, ".") !== email.replace(/,/g, ".")) return;
    document.querySelector("document-title").click();
    return;
  }

  if (e.code === "Escape" && document.getElementById("footnotes-alert-placeholder").innerHTML !== "") {
    e.preventDefault();
    document.getElementById("footnotes-alert-placeholder").innerHTML = "";
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
  
  if (e.ctrlKey && e.shiftKey && e.code === "KeyP") {
    e.preventDefault();
    new bootstrap.Modal(document.getElementById("word-count-modal")).show();
    return;
  }
});

document.body.addEventListener('keydown', (e) => {
  if (e.code === "Escape" && document.getElementById("footnotes-alert-placeholder").innerHTML !== "") {
    e.preventDefault();
    document.getElementById("footnotes-alert-placeholder").innerHTML = "";
    return;
  }

  // title
  if (e.altKey && e.shiftKey && e.code === "KeyT") {
    if (documentData.owner.replace(/,/g, ".") !== email.replace(/,/g, ".")) return;
    document.querySelector("document-title").click();
    return;
  }

  // document settings
  if (e.ctrlKey && e.altKey && e.code === "KeyS" && documentData.owner.replace(/,/g, ".") === email.replace(/,/g, ".")) {
    document.getElementById("settings").click();
  }

  // document summary
  if (e.ctrlKey && e.shiftKey && e.code === "KeyP") {
    e.preventDefault();
    const clean = string => {
      const alphabet = string.replace(/[^A-Za-z']+/g, " ").trim();
      const lowerCase = alphabet.toLowerCase();
      return lowerCase;
    }
    
    const text = clean(documentData.content);
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
  document.getElementById("share-link-input").value = `https://notes.mzecheru.com/view/id=?${document_uuid}`;
  setGreen(document.getElementById("share-view-link"));
  document.getElementById("share-view-link").blur();
});

document.getElementById("share-edit-link").addEventListener('click', () => {
  document.getElementById("share-link-input").value = `https://notes.mzecheru.com/edit/id=?${document_uuid}`;
  setGreen(document.getElementById("share-edit-link"));
  document.getElementById("share-edit-link").blur();
});

document.getElementById("share-copy-link").addEventListener('click', () => {
  document.getElementById("share-link-input").value = `https://notes.mzecheru.com/copy/id=?${document_uuid}`;
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

document.getElementById("make-a-copy-btn").addEventListener("click", () => {
  window.location.href = `/document/copy/?id=${document_uuid}`;
});

function _print() {
  // delete alert if it's open
  document.getElementById("footnotes-alert-placeholder")?.remove();
  let printContents = compileMarkdown(documentData.content);
  // if (documentData.type === "code") {
  //   printContents = printContents.substring(0, 39) + printContents.substring(40, printContents.length);
  // }
  document.body.innerHTML = printContents;
  window.print();
  window.location.reload();
}

document.getElementById("print-document-btn").addEventListener('click', _print);

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
    });
  });

  new bootstrap.Modal(document.getElementById("settings-modal")).show();
});

document.getElementById("settings-modal").addEventListener("hidden.bs.modal", () => {
  window.location.reload();
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
  saveSettings().then(() => {
    window.location.reload();
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

// initialize popovers
[...document.querySelectorAll('[data-bs-toggle="popover"]')].forEach(el => new bootstrap.Popover(el))