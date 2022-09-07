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

function compileMarkdown(text) {
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
  .replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' rel='noopener noreferrer' target='_blank'>$1</a>")

  // code block
  .replace(/\`\`\`(.*?)\`\`\`/g, "<pre class='prettyprint'>$1</pre>")

  // highlight
  .replace(/!\`(.*?)\`/g, "<mark>$1</mark>")

  // inline code
  .replace(/\`(.*?)\`/g, "<code>$1</code>")
  
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

  // center
  .replace(/\|(.*?)\|/g, "<center>$1</center>")

  if (html.startsWith("<br>"))
    html = html.substring(4, html.length);
  
  if (html.endsWith("<br>"))
    return html.substring(0, html.length - 4);

  return html;
}

async function saveDocument() {
  if (!getCookie("nmd-validation")) {
    new bootstrap.Modal(document.getElementById("login-modal")).show();
    let text = notepad.value.trim();
    const html = compileMarkdown(text);
    doc.innerHTML = html;
    return;
  }

  let text = notepad.value.trim();
  if (text.length === 0 || text === previousText) return;
  
  // set the previous text to the current text
  previousText = JSON.parse(JSON.stringify({text})).text; // deepcopy
  
  // compile the markdown to html
  const html = compileMarkdown(text);

  // check if the new html is different from the previous html
  if (html === previousHTML) return;

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

document.getElementById("notepad").addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    notepad.blur();
    return;
  }

  // codebox
  if (event.altKey && event.code === "Backquote") {
    event.preventDefault();
    insertText("```\n\n```", -4);
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
      insertText("$[]()", -3);
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
      insertText("- [x] ");
    } else { // checked
      event.preventDefault();
      insertText("- [] ");
    }
    return;
  }

  // strikethrough
  if (event.altKey && event.code === "KeyS") {
    event.preventDefault();
    insertText("~~~~", -2);
    return;
  }

  // highlight
  if (event.altKey && event.code === "KeyH") {
    event.preventDefault();
    insertText("!``", -1);
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
  
  if (event.ctrlKey) {
    switch (event.code) {
      // italics
      case "KeyI":
        event.preventDefault();
        insertText("**", -1);
        break;

      // bold
      case "KeyB":
        event.preventDefault();
        insertText("****", -2);
        break;

      // underline
      case "KeyU":
        event.preventDefault();
        insertText("____", -2);
        break;

      // save document
      case "KeyS":
        event.preventDefault();
        saveDocument();
        break;

      // pink text
      case "KeyH":
        event.preventDefault();
        insertText("``", -1);
        break;

      // hyperlink
      case "KeyL":
        // hyperlink
        event.preventDefault();
        insertText("[]()", -3);
        break;

      // image
      case "KeyM":
        event.preventDefault();
        insertText("![]()", -3);
        break;

      // iframe embed
      case "KeyE":
        event.preventDefault();
        insertText("&[]()", -3);
        break;

      // quote
      case "KeyQ":
        event.preventDefault();
        insertText("> ");
        break;

      // footnote
      case "Digit6":
        if (event.shiftKey) {
          event.preventDefault();
          insertText("[^1]\n\n[^1]: ");
        }
        break;
    }

    // superscript is ^text^ and subscript is _text_
  }

  // replace tab with \t
  if (event.key === "Tab") {
    event.preventDefault();
    insertText("\t")
  }
});

document.getElementById("italics").addEventListener("click", () => {
  insertText("**", -1);
  notepad.focus();
});

document.getElementById("bold").addEventListener("click", () => {
  insertText("****", -2);
  notepad.focus();
});

document.getElementById("underline").addEventListener("click", () => {
  insertText("____", -2);
  notepad.focus();
});

document.getElementById("strikethrough").addEventListener("click", () => {
  insertText("~~~~", -2);
  notepad.focus();
});

document.getElementById("highlight").addEventListener("click", () => {
  insertText("``", -1);
  notepad.focus();
});

document.getElementById("link").addEventListener("click", () => {
  insertText("[]()", -3);
  notepad.focus();
});

document.getElementById("image").addEventListener("click", () => {
  insertText("![]()", -3);
  notepad.focus();
});

document.getElementById("video").addEventListener("click", () => {
  insertText("$[]()", -3);
  notepad.focus();
});

document.getElementById("save").addEventListener("click", () => {
  saveDocument();
  notepad.focus();
});

document.getElementById("embed").addEventListener("click", () => {
  insertText("&[]()", -3);
  notepad.focus();
});

document.getElementById("quote").addEventListener("click", () => {
  insertText("> ");
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
  if (event.ctrlKey) 
    insertText("- [x] ");
  else insertText("- [] ");
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
  new Promise((_r) => setTimeout(_r, 500)).then(() => modal_new_title_input.focus());
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
