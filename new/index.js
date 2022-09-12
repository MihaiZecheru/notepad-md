'use strict';

import { getCookie, setCookie } from "../modules/cookies.mjs";
import { max_title_length } from "../modules/max_lengths.mjs";
import getDate from "../modules/date.mjs";

const notepad = document.getElementById("notepad");
const doc = document.getElementById("document");

notepad.focus();
let previousText = "";
let previousHTML = "";
let document_uuid = "";
let title = "Untitled Document";

function uuid4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const isUrl = string => {
  try { return Boolean(new URL(string)); }
  catch(e){ return false; }
}

function get_footnote_ids() {
  const footnotes = [...new Set(notepad.value.match(/\[\^(\d{1,5})\]/g))];
  if (!footnotes) return [];
  return footnotes.map(x => x.match(/\d{1,5}/)[0]);
}

function get_footnote_count() {
  const footnotes = notepad.value.match(/\[\^(\d{1,5})\]/g);
  if (!footnotes) return 0;
  return Math.ceil(footnotes.length / 2);
}

function compileMarkdown(text) {
  // create a unique id for each set of footnotes in the document
  const footnote_ids = get_footnote_ids();
  let footnote_uuids = {};
  for (let i = 0; i < get_footnote_count(); i++) {
    footnote_uuids[footnote_ids[i]] = uuid4();
  }

  // add new line to the bottom so that blockquotes at the bottom of the document get recognized, and to the top so lists at the top get recognized
  text = "\n" + text + "\n";

  //               newline
  let html = text.replace(/\n/g, "<br>")
  
  // blockquote
  .replace(/>\s(.*?)<br>/g, "<div class='blockquote'>$1</div><br>")

  // tab
  .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;")

  // bold
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
    const url = c.match(/\((.*?)\)/g)[0];
    return `<img src="${url.substring(1, url.length - 1)}" alt="${content.substring(1, content.length - 1)}" id="${uuid}" style="width: 100%;"><label class="document-content-label" for="${uuid}">${content.substring(1, content.length - 1)}</label>`
  })

  // video and embed
  .replace(/(\$|&)\[(.*?)\]\((.*?)\)/g, (c) => {
    const uuid = uuid4();
    const content = c.match(/\[(.*?)\]/g)[0];
    const url = c.match(/\((.*?)\)/g)[0];
    return `<iframe id="${uuid}" src="${url.substring(1, url.length - 1)}" width="100%" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe><label class="document-content-label" for="${uuid}">${content.substring(1, content.length - 1)}</label>`
  })

  // hyperlink
  .replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' rel='noopener noreferrer' target='_blank' tabindex='-1'>$1</a>")

  // codeblock
  .replace(/\`\`\`<br>(.*?)<br>\`\`\`/g, "<pre class='prettyprint'>$1</pre>")

  // inline code / pink text
  .replace(/!\`(.*?)\`/g, "<code>$1</code>")

  // highlight
  .replace(/\`(.*?)\`/g, "<mark>$1</mark>")
  
  // checkbox
  .replace(/- \[.?\]\ (.*?)<br>/g, (c) => {
    const uuid = uuid4();
    const is_filled = c.match(/\[x\]/g) !== null;
    const content = c.match(/\ (.*?)<br>/g)[0];
    return `<div class="mb-3 form-check nmd-checkbox"><input type="checkbox" id="${uuid}" class="form-check-input" ${is_filled ? "checked" : ""}><label for="${uuid}" class="form-check-label document-content-label">${content.substring(4, content.length - 4)}</label></div><br>`;
  })

  // horizontal rule
  .replace(/<br>---/g, "<hr>")

  // unordered list
  .replace(/<br>- (.*?)(?:(?!<br>).)*/g, (c) => {
    const content = c.substring(6);
    return `<ul><li>${content}</li></ul>`;
  })
  
  // ordered list
  .replace(/<br>\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
    const number = c.match(/\d{1,3}/g)[0];
    const content = c.substring(6);
    return `<ol start="${number}"><li>${content}</li></ol>`;
  })

  // headers
  .replace(/#{5}\s?(.*?)<br>/g, "<h5>$1</h5>")
  .replace(/#{4}\s?(.*?)<br>/g, "<h4>$1</h4>")
  .replace(/#{3}\s?(.*?)<br>/g, "<h3>$1</h3>")
  .replace(/#{2}\s?(.*?)<br>/g, "<h2>$1</h2>")
  .replace(/#{1}\s?(.*?)<br>/g, "<h1>$1</h1>")

  // table
  .replace(/(<br>\|\s?(.*?)\s?\|(?:(?!<br>).)*){2,}/g, (c) => {
    let rows = c.split('<br>').slice(1);
    const headers = "<tr>" + rows.shift().split('|').slice(1, -1).map((header) => `<th><center>${header.trim()}</center></th>`).join("") + "</tr>";
    const rows_html = rows.map((row) => "<tr>" + (row.split('|').slice(1, -1).map((cell) => row.endsWith('!') ? `<td><center>${cell.trim()}</center></td>` : row.endsWith('$') ? `<td class="table-rig  ht-align">${cell.trim()}</td>` : `<td>${cell.trim()}</td>`).join("")) + "</tr>").join("");
    return `<table>${headers}${rows_html}</table>`;
  })

  // center pipes
  .replace(/\{(.*?)\}/g, "<center>$1</center>")

  // footnote-bottom
  .replace(/\[\^(\d{1,5})\]\: (.*?)<br>/g, (c) => {
    const footnote_id = c.substring(2, c.indexOf("]"));
    const footnote_uuid = footnote_uuids[footnote_id];
    const footnote_content = c.substring(c.indexOf("]: ") + 3, c.length - 4);
    return `<span class='footnote-bottom' data-footnote-id="${footnote_id}" id="${footnote_uuid}"><u><sup>${footnote_id}</sup></u> ${footnote_content}</span><br>`;
  })
  // footnote-top
  .replace(/\[\^(\d{1,5})\]/g, (c) => {
    const footnote_id = c.substring(c.indexOf("[^") + 2, c.length - 1);
    const footnote_uuid = footnote_uuids[footnote_id];
    return `<span class="footnote-top" onclick="goto(\"${footnote_uuid}\")">${footnote_id}</span>`;
  })

  // superscript
  .replace(/\^(.*?)\^/g, "<sup>$1</sup>")

  if (html.startsWith("<br>"))
    html = html.substring(4, html.length);
  
  if (html.endsWith("<br>"))
    return html.substring(0, html.length - 4);
  return html;
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

async function saveDocument() {
  if (!getCookie("nmd-validation")) {
    new bootstrap.Modal(document.getElementById("login-modal")).show();
    let text = notepad.value.trim();
    const html = compileMarkdown(text);
    doc.innerHTML = html;
    return;
  }

  let text = notepad.value;
  if (text.length === 0 || text === previousText) return;
  showSpinner();
  setSaveStatus("saving");

  text = text.trim();
  
  // set the previous text to the current text
  previousText = JSON.parse(JSON.stringify({text})).text; // deepcopy
  
  // compile the markdown to html
  const html = compileMarkdown(text);

  // check if the new html is different from the previous html
  if (html === previousHTML) {
    hideSpinner();
    setSaveStatus("saved");
    return;
  }

  previousHTML = JSON.parse(JSON.stringify({html})).html; // deepcopy

  // set the document div to the new html
  doc.innerHTML = html;

  // get a uuid to identify the document
  if (!document_uuid) {
    document_uuid = uuid4();
  }

  // upload the document to the server
  await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}.json`, {
    method: "PUT",
    headers: {
      "Access-Control-Allow-Origin":  "http, https",
      "Access-Control-Allow-Methods": "PUT, GET, POST, DELETE, OPTONS",
      "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title, content: html, last_visit: getDate() })
  });

  if (!JSON.parse(getCookie("documents")).includes(document_uuid)) {
    await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents_id_list/${JSON.parse(getCookie("nmd-validation")).email.replace(/\./g, ",")}.json`, {
      method: "POST",
      headers: {
        "Access-Control-Allow-Origin":  "http, https",
        "Access-Control-Allow-Methods": "PUT, GET, POST, DELETE, OPTONS",
        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(document_uuid)
    });

    const cookie = JSON.parse(getCookie("nmd-validation"));
    cookie.document_count++;

    await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${JSON.parse(getCookie("nmd-validation")).email.replace(/\./g, ",")}/document_count.json`, {
      method: "PUT",
      headers: {
        "Access-Control-Allow-Origin":  "http, https",
        "Access-Control-Allow-Methods": "PUT, GET, POST, DELETE, OPTONS",
        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(cookie.document_count)
    });

    setCookie("nmd-validation", JSON.stringify(cookie));
    setCookie("documents", JSON.stringify(getCookie("documents") ? [ document_uuid ].concat(JSON.parse(getCookie("documents"))) : [ document_uuid ]));
  }

  hideSpinner();
  setSaveStatus("saved");
}

function getStartAndEndPositions() {
  return { start: notepad.selectionStart, end: notepad.selectionEnd };
}

function insertText(text, cursor_movement = 0) {
  const { start, end } = getStartAndEndPositions();
  notepad.value = notepad.value.substring(0, start) + text + notepad.value.substring(end);
  notepad.selectionStart = notepad.selectionEnd = start + text.length + cursor_movement;
}

document.addEventListener("keypress", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    notepad.focus();
  }
});

async function check_for_changes() {
  if (previousText !== notepad.value) {
    setSaveStatus("not-saved");
    previousText === notepad.value;
  }
}

document.getElementById("notepad").addEventListener("keydown", (event) => {
  check_for_changes();
  const sel = window.getSelection().toString();
  
  if (event.key === "Escape") {
    event.preventDefault();
    notepad.blur();
    return;
  }

  // codebox
  if (event.altKey && event.code === "Backquote") {
    event.preventDefault();
    if (sel.length === 0) {
      insertText("```\n\n```", -4);
    } else if (notepad.value.includes(sel)) {
      insertText(`\`\`\`\n${sel}\n\`\`\``);
    }
  }

  // horizontal rule
  if (event.altKey && event.code === "KeyR") {
    event.preventDefault();
    insertText("---\n");
    return;
  }

  // video
  if (event.altKey && event.code === "KeyV") {
    if (event.shiftKey) {
      event.preventDefault();
      if (sel.length === 0) {
        insertText("$[]()", -3);
      } else if (notepad.value.includes(sel)) {
        if (isUrl(sel)) {
          insertText(`$[](${sel})`, 0 - (3 + sel.length));
        } else {
          insertText("$[]()", -3);
        }
      }
    } else {
      event.preventDefault();
    }
    return;
  }

  // lists
  if (event.altKey && event.code === "KeyL") {
    if (event.shiftKey) {
      event.preventDefault();
      insertText("1. \n2. \n3. ", -8);
    } else {
      event.preventDefault();
      insertText("- \n- \n- ", -6);
    }
    return;
  }

  // checkbox
  if (event.altKey && event.code === "KeyC") {
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
    return;
  }

  // strikethrough
  if (event.altKey && event.code === "KeyS") {
    event.preventDefault();
    if (sel.length === 0) {
      insertText("~~~~", -2);
    } else if (notepad.value.includes(sel)) {
      insertText(`~~${sel}~~`, 0);
    }
    return;
  }

  // highlight
  if (event.altKey && event.code === "KeyH") {
    event.preventDefault();
    if (sel.length === 0) {
      insertText("``", -1);
    } else if (notepad.value.includes(sel)) {
      insertText(`\`${sel}\``, 0);
    }
    return;
  }

  // table
  if (event.altKey && event.code === "KeyT") {
    event.preventDefault();
    insertText("|  | title2 | title3 |\n| content1 | content2 | content3 |", -55);
    return;
  }

  if (event.altKey && event.code === "KeyN") {
    event.preventDefault();
    new bootstrap.Modal(document.getElementById("new-document-warning")).show();
  }

  // center
  if (event.altKey && event.code === "KeyE") {
    if (sel.length === 0) {
      insertText("{}", -1);
    } else if (notepad.value.includes(sel)) {
      insertText(`{${sel}}`, 0);
    }
  }
  
  if (event.ctrlKey) {
    switch (event.code) {
      case "KeyK":
        event.preventDefault();
        if (event.shiftKey) {
          if (notepad.selectionStart === notepad.selectionEnd) {
            const lines = notepad.value.split("\n");
            const line = notepad.value.substring(0, notepad.selectionStart).split("\n").length;
            let start_of_line = 0;
            for (let i = 0; i < line - 1; i++) {
              start_of_line += lines[i].length + 1;
            }
            const end_of_line = start_of_line + lines[line - 1].length;
            notepad.value = notepad.value.substring(0, start_of_line - 1) + notepad.value.substring(end_of_line);
            notepad.selectionStart = notepad.selectionEnd = start_of_line;
          } else {
            notepad.value = notepad.value.substring(0, notepad.selectionStart) + notepad.value.substring(notepad.selectionEnd);
            notepad.selectionStart = notepad.selectionEnd = notepad.selectionStart;
          }
        }
        break;

      // italics
      case "KeyI":
        if (event.shiftKey) {
          return;
        }
        event.preventDefault();
        if (sel.length === 0) {
          insertText("**", -1);
        } else if (notepad.value.includes(sel)) {
          insertText(`*${sel}*`, 0);
        }
        break;

      // bold
      case "KeyB":
        event.preventDefault();
        if (sel.length === 0) {
          insertText("****", -2);
        } else if (notepad.value.includes(sel)) {
          insertText(`**${sel}**`, 0);
        };
        break;

      // underline
      case "KeyU":
        event.preventDefault();
        if (sel.length === 0) {
          insertText("____", -2);
        } else if (notepad.value.includes(sel)) {
          insertText(`__${sel}__`, 0);
        }
        break;

      // save document
      case "KeyS":
        event.preventDefault();
        saveDocument();
        break;

      // pink text
      case "KeyH":
        event.preventDefault();
        if (sel.length === 0) {
          insertText("``", -1);
        } else if (notepad.value.includes(sel)) {
          insertText(`\`${sel}\``, 0);
        }
        break;

      // hyperlink
      case "KeyL":
        event.preventDefault();
        if (sel.length === 0) {
          insertText("[]()", -3);
        } else if (notepad.value.includes(sel)) {
          if (isUrl(sel)) {
            insertText(`[](${sel})`, 0 - (3 + sel.length));
          } else {
            insertText("[]()", -3);
          }
        }
        break;

      // image
      case "KeyM":
        event.preventDefault();
        if (sel.length === 0) {
          insertText("![]()", -3);
        } else if (notepad.value.includes(sel)) {
          if (isUrl(sel)) {
            insertText(`![](${sel})`, 0 - (3 + sel.length));
          } else {
            insertText("![]()", -3);
          }
        }
        break;

      // iframe embed
      case "KeyE":
        event.preventDefault();
        if (sel.length === 0) {
          insertText("&[]()", -3);
        } else if (notepad.value.includes(sel)) {
          if (isUrl(sel)) {
            insertText(`&[](${sel})`, 0 - (3 + sel.length));
          } else {
            insertText("&[]()", -3);
          }
        }
        break;

      // quote
      case "KeyQ":
        event.preventDefault();
        if (sel.length === 0) {
          insertText("> ");
        } else if (notepad.value.includes(sel)) {
          insertText(`> ${sel}`, 0);
        }
        break;

      // footnote
      case "Digit6":
        if (event.shiftKey) {
          event.preventDefault();
          const location = notepad.selectionStart;
          const footnote_count = get_footnote_count() + 1;
          insertText(`[^${footnote_count}]`);
          notepad.selectionStart = notepad.value.length;
          notepad.value += `\n[^${footnote_count}]: `;
          notepad.selectionStart = notepad.selectionEnd = location + `[^${footnote_count}]`.length;
        }
        break;

      // subscript
      case "Comma":
        event.preventDefault();
        if (sel.length === 0) {
          insertText("__", -1);
        } else if (notepad.value.includes(sel)) {
          insertText(`_${sel}_`, 0);
        }
        break;

      case "Period":
        event.preventDefault();
        if (sel.length === 0) {
          insertText("^^", -1);
        } else if (notepad.value.includes(sel)) {
          insertText(`^${sel}^`, 0);
        }
        break;
    }
  }

  // replace tab with \t
  if (event.key === "Tab") {
    event.preventDefault();
    insertText("\t")
  }
});

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
      insertText("[]()", -3);
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
      insertText("![]()", -3);
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
      insertText("$[]()", -3);
    }
  }
  notepad.focus();
});

document.getElementById("save").addEventListener("click", () => {
  saveDocument();
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
      insertText("&[]()", -3);
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

const modal_new_title_input = document.querySelector("div.modal-body > form > div.mb-3 > input");

document.querySelector("document-title").addEventListener("click", () => {
  modal_new_title_input.value = title;
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
  if (new_title === title) return;

  const document_title = document.querySelector("document-title");

  if (!new_title || new_title === "Untitled Document") {
    title = "Untitled Document";
    document_title.style.color = "tomato";
  } else {
    title = new_title;
    document_title.style.color = "#0d6efd";
  }
  
  if (!document_uuid) document_uuid = uuid4();

  // upload the new title to the server
  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}/title.json`, {
    method: "PUT",
    headers: {
      "Access-Control-Allow-Origin":  "http, https",
      "Access-Control-Allow-Methods": "PUT, GET, POST, DELETE, OPTONS",
      "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(title)
  }).then(() => {
    fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}/last_visit.json`, {
      method: "PUT",
      headers: {
        "Access-Control-Allow-Origin":  "http, https",
        "Access-Control-Allow-Methods": "PUT, GET, POST, DELETE, OPTONS",
        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization",
        "Content-Type": "application/json"
      },
    body: JSON.stringify(getDate())
    }).then(() => {
      if (!JSON.parse(getCookie("documents")).includes(document_uuid)) {
        fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents_id_list/${JSON.parse(getCookie("nmd-validation")).email.replace(/\./g, ",")}.json`, {
          method: "POST",
          headers: {
            "Access-Control-Allow-Origin":  "http, https",
            "Access-Control-Allow-Methods": "PUT, GET, POST, DELETE, OPTONS",
            "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(document_uuid)
        });
    
        let nmd_validation = JSON.parse(getCookie("nmd-validation"));
        nmd_validation.document_count++;
        setCookie("nmd-validation", JSON.stringify(nmd_validation));
        setCookie("documents", JSON.stringify(getCookie("documents") ? [ document_uuid ].concat(JSON.parse(getCookie("documents"))) : [ document_uuid ]));
      }
    })
  }).then(() => {
    document_title.innerText = title;
  });
});

document.addEventListener("keydown", (event) => {
  if (event.altKey && event.code === "KeyN") {
    event.preventDefault();
    new bootstrap.Modal(document.getElementById("new-document-warning")).show();
  }
});

document.querySelector("div.modal-footer #new-document-modal-quit-save").addEventListener("click", () => {
  saveDocument().then(() => window.location.reload());
});

document.querySelector("div.modal-footer #new-document-modal-quit-nosave").addEventListener("click", () => {
  window.location.reload();
});

document.getElementById("register-btn-modal").addEventListener("click", () => {
  window.location.href = "/account/register/?b=new";
});

document.getElementById("login-btn-modal").addEventListener("click", () => {
  window.location.href = "/account/login/?b=new";
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
  return compileMarkdown(notepad.value.trim());
}

document.getElementById("save-as-html").addEventListener("click", () => {
  const _HTML = `<!DOCTYPE html><html lang="en"><head><title>${title}</title></head><body>${getHtml()}</body></html>`;
  download(_HTML, `${title}.html`);
});

document.getElementById("save-as-nmd").addEventListener("click", () => {
  const _HTML = getHtml();
  download(_HTML, `${title}.nmd`);
}); 

document.getElementById("download-document-as-html-btn").addEventListener('click', () => {
  download(getHtml(), `${title}.html`);
});

const toggle_direct_edit_switch = document.getElementById("toggle-direct-edit");
toggle_direct_edit_switch.addEventListener("click", () => {
  if (toggle_direct_edit_switch.checked) {
    doc.setAttribute("contenteditable", "true");
    doc.focus();
  } else {
    doc.setAttribute("contenteditable", "false");
  }
});

document.getElementById("download-document-as-nmd-btn").addEventListener('click', () => {
  download(getHtml(), `${title}.nmd`);
});

document.getElementById("copy-html-btn").addEventListener('click', () => {
  navigator.clipboard.writeText(getHtml());
});

document.getElementById("copy-md-btn").addEventListener('click', () => {
  navigator.clipboard.writeText(notepad.value.trim());
});

document.getElementById("download-notepad-as-txt-btn").addEventListener('click', () => {
  download(notepad.value.trim(), `${title}.txt`);
});

document.getElementById("export-as-google-doc-btn").addEventListener('click', () => {
  // todo: add google docs export
});
