'use strict';

import { getCookie, setCookie } from "../modules/cookies.mjs";
import { max_title_length } from "../modules/max_lengths.mjs";
import getDate from "../modules/date.mjs";

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

const mode = parameters.get('mode');
if (mode === "view") {
  new Promise((r_) => {
    setTimeout(r_, 250);
  }).then(() => {
    document.querySelector(".dropleft > span").click();
    document.getElementById("notepad").blur();
  });
} else if (mode === "edit") {
  new Promise((r_) => {
    setTimeout(r_, 250);
  }).then(() => {
    document.querySelector("main div > span").click();
  });
}

let BOLD_COLOR = "#FF69B4";

const isUrl = string => {
  try { return Boolean(new URL(string)); }
  catch(e) { return false; }
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

function htmlToMarkdown(html) {
  html = `<br>${html}<br>`;
  
  // tab
  switch (documentData.indentSize) {
    case 2:
      html = html.replace(/(&nbsp;){2}/g, "\t");
      break;

    case 3:
      html = html.replace(/(&nbsp;){3}/g, "\t");
      break;

    case 4:
      html = html.replace(/(&nbsp;){4}/g, "\t");
      break;

    case 5:
      html = html.replace(/(&nbsp;){5}/g, "\t");
      break;

    case 6:
      html = html.replace(/(&nbsp;){6}/g, "\t");
      break;

    case 7:
      html = html.replace(/(&nbsp;){7}/g, "\t");
      break;

    case 8:
      html = html.replace(/(&nbsp;){8}/g, "\t");
      break;

    case 9:
      html = html.replace(/(&nbsp;){9}/g, "\t");
      break;

    case 10:
      html = html.replace(/(&nbsp;){10}/g, "\t");
      break;
  }

  // blockquote
  let text = html.replace(/<div class='blockquote'>(.*?)<\/div>/g, "> $1<br>")

  // right-align
  .replace(/<div style='text-align: right;'>(.*?)<\/div>/g, "{{$1}}")

  // pink color (pink bold)
  .replace(/<b>(.*?)<\/b>/g, "**$1**")

  // italic
  .replace(/<i>(.*?)<\/i>/g, "*$1*")

  // underline
  .replace(/<u>(.*?)<\/u>/g, "__$1__")

  // strikethrough
  .replace(/<del>(.*?)<\/del>/g, "~~$1~~")

  // highlight
  .replace(/<mark>(.*?)<\/mark>/g, "`$1`")

  // heading 1
  .replace(/<h1>(.*?)<\/h1>/g, "# $1")

  // heading 2
  .replace(/<h2>(.*?)<\/h2>/g, "## $1")

  // heading 3
  .replace(/<h3>(.*?)<\/h3>/g, "### $1")

  // heading 4
  .replace(/<h4>(.*?)<\/h4>/g, "#### $1")

  // heading 5
  .replace(/<h5>(.*?)<\/h5>/g, "##### $1")

  // hyperlink
  .replace(/<a href='(.*?)' rel='noopener noreferrer' target='_blank' tabindex='-1'>(.*?)<\/a>/g, "[$2]($1)")
  .replace(/<a href='(.*?)' rel='noopener noreferrer' target='_blank'>(.*?)<\/a>/g, "[$2]($1)") // backwards compatibility

  // image
  .replace(/<img src="(.*?)" alt="(.*?)" id="(.*?)" style="width: 100%;"><label class="document-content-label" for="(.*?)">(.*?)<\/label>/g, "![$2]($1)")

  // video and embed
  .replace(/<iframe id="(.*?)" src="(.*?)" width="100%" height="(.*?)%" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen><\/iframe>/g, "&[$3]($2)")

  // unordered list
  .replace(/<ul><li style="list-style: none; margin-top: -1.5em"><ul><li>(.*?)<\/li><\/ul><\/li><\/ul>/g, "\t- $1")
  .replace(/<ul><li>(.*?)<\/li><\/ul>/g, "\n- $1")

  // ordered list
  .replace(/<ul style="margin-top: -1.5em"><li style="list-style: none"><ol start="(.*?)"><li>(.*?)<\/li><\/ol><\/li><\/ul>/g, "\t$1 $2")
  .replace(/<ol start=\"(.*?)\"><li>(.*?)<\/li><\/ol>/g, "\n$1. $2")
  
  // replacement br
  .replace(/<rbr>/g, "\n")

  // right-align
  .replace(/<div style="text-align: right;">(.*?)<\/div>/g, "{{$1}}")
  
  // center
  .replace(/<center>(.*?)<\/center>/g, "{$1}")

  // checkbox
  .replace(/<div class="mb-3 form-check nmd-checkbox"><input type="checkbox" id="(.*?)" class="form-check-input"><label for="(.*?)" class="form-check-label document-content-label">(.*?)<\/label><\/div>/g, (c) => {
    const _text = c.substring(c.indexOf("document-content-label\">") + 24, c.indexOf("</label>"));

    if (c.includes("checked")) {
      return "- [x] " + _text;
    } else {
      return "- [] " + _text;
    }
  })

  // table
  .replace(/<table>(.*?)<\/table>/g, (table) => {
    const columns = table.match(/<th>(.*?)<\/th>/g).length;
    
    table = '\n' + table
      .replace(/<th>\{(.*?)\}/g, "| $1")
      .replace(/(<\/th>\|)|(<\/th>)/g, " |")
      .replace(/<(\/)?tr>/g, "")
      .replace(/<(\/)?table>/g, "");

    switch (columns) {
      case 1:
        table = table.replace(/<td>(.*?)<\/td>/g, "\n| $1 |");
        break;

      case 2:
        table = table.replace(/<td>(.*?)<\/td><td>(.*?)<\/td>/g, "\n| $1 | $2 |");
        break;

      case 3:
        table = table.replace(/<td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td>/g, "\n| $1 | $2 | $3 |");
        break;

      case 4:
        table = table.replace(/<td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td>/g, "\n| $1 | $2 | $3 | $4 |");
        break;

      case 5:
        table = table.replace(/<td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td>/g, "\n| $1 | $2 | $3 | $4 | $5 |");
        break;

      case 6:
        table = table.replace(/<td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td>/g, "\n| $1 | $2 | $3 | $4 | $5 | $6 |");
        break;

      case 7:
        table = table.replace(/<td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td>/g, "\n| $1 | $2 | $3 | $4 | $5 | $6 | $7 |");
        break;

      case 8:
        table = table.replace(/<td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td>/g, "\n| $1 | $2 | $3 | $4 | $5 | $6 | $7 | $8 |");
        break;

      case 9:
        table = table.replace(/<td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td>/g, "\n| $1 | $2 | $3 | $4 | $5 | $6 | $7 | $8 | $9 |");
        break;

      case 10:
        table = table.replace(/<td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td>/g, "\n| $1 | $2 | $3 | $4 | $5 | $6 | $7 | $8 | $9 | $10 |");
        break;
    }

    return table;
  })

  // superscript
  .replace(/<sup>(.*?)<\/sup>/g, "^$1^")

  // footnote-bottom
  .replace(/<span class='footnote-bottom' data-footnote-id="(.*?)" id="(.*?)">__\^(\d{1,5})\^__ (.*?)<\/span><br>/g, (c) => {
    const footnote_id = c.substring(c.indexOf("data-footnote-id=\"") + 18, c.indexOf("\" id=\""));
    const footnote_content = c.substring(c.indexOf("^__ ") + 4, c.indexOf("</span>"));
    return `[^${footnote_id}]: ${footnote_content}<br>`;
  })
  // footnote-top
  .replace(/<span class="footnote-top" onclick="show_footnote\(\'(.*?)\'\)">\^\[(.*?)\]\^<\/span>/g, "[^$2]")

  // horizontal rule
  .replace(/<hr>/g, "---")

  // newline
  .replace(/<br>/g, "\n")

  // .replace(//g, "\n")

  if (text.substring(0, 1) === "\n") {
    text = text.substring(1);
  }

  if (text.slice(text.length - 1) === "\n") {
    text = text.substring(0, text.length - 1);
  }

  return text;
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
  owner: email,
  content: "",
  last_visit: Date.now(),
  created: null,
  description: "",
  type: "markdown",
  visibility: "public",
  language: "en",
  theme: "light",
  font: "comfortaa",
  fontSize: 16,
  indentSize: 8,
  authors: [ email.replace(/,/g, ".") ]
};

async function saveSettings() {
  showSpinner();
  setSaveStatus('saving');
  await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}.json`, {
    method: 'PUT',
    body: JSON.stringify(documentData)
  }).then(() => { hideSpinner(); setSaveStatus('saved'); });
}

let NOTEPAD_DISABLED = false;

// get the document content
fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}.json`, {
  method: "GET",
}).then(r => r.json()).then(_doc => {
  if (!_doc) window.location.href = "/account/me/documents/?error=invalid_id";
  
  documentData = _doc;
  documentData.last_visit = Date.now();
  documentData.authors?.forEach(_email => _email.replace(/,/g, "."));

  if (_doc.owner !== email && !documentData.authors.includes(email)) {
    // nobody can see if the document is private
    if (_doc.visibility === "private") window.location.href = "/account/me/documents/?error=private_document";
    // only the owner can edit if the document is public, but everyone can see
    notepad.style.opacity = '0.5';
    notepad.style.cursor = 'not-allowed';
    notepad.style.userSelect = "none";
    notepad.classList.add("disable-highlighting");
    notepad.setAttribute("disabled", "true");
    notepad.setAttribute("unselectable", "on");
    // prevent selecting
    notepad.addEventListener('select', (event) => {
      event.preventDefault();
      notepad.selectionStart = notepad.selectionEnd;
    }, false);
    NOTEPAD_DISABLED = true;
    document.querySelector("main div > span").setAttribute("title", "Notepad Fullscreen | Disabled");
    notepad.setAttribute("title", "You do not have permission to edit this document");
  }

  doc.style.fontSize = documentData.fontSize + 'px';
  notepad.style.fontSize = documentData.fontSize + 'px';

  notepad.style.tabSize = documentData.indentSize;

  previousHTML = _doc.content || "";
  doc.innerHTML = `<div id="footnotes-alert-placeholder"></div>${previousHTML}`;

  // fill in checkboxes
  (async () => {
    let checkboxes = Array.from(doc.querySelectorAll("input[type='checkbox']"));
    if (checkboxes.length) {
      const checkbox_data = await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/checkboxes/${document_uuid}/${email}.json`, { method: 'GET' }).then(r => r.json());
      checkboxes.forEach((checkbox) => {
        checkbox.checked = checkbox_data[checkbox.id];
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
  title_ele.style.color = "#0d6efd";
  document.title = documentData.title;
  notepad.value = previousText = htmlToMarkdown(_doc.content || "");
  notepad.setSelectionRange(0, 0);

  // add bold contextmenu event listeners
  document.querySelectorAll("#document b").forEach(b => {
    b.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      b.id = uuid4();
      new BootstrapMenu(`#${b.id}`, {
        actions: [{
          name: "Change Color",
          onClick: () => {
            new bootstrap.Modal(document.getElementById("change-bold-text-color-modal")).show();
            // document.getElementById("color-picker").value = BOLD_COLOR;
          }
        }]
      });
    });
  });
});

notepad.focus();

fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuid}/last_visit.json`, {
  method: "PUT",
  body: JSON.stringify(getDate())
});

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
  text = "\n" + text + "\n";

  // tab
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

  //              newline
  let html = text.replace(/\n/g, "<br>")

  // escape characters
  .replace(/\\#/g, "<HASHTAG>")
  .replace(/\\\*/g, "<ASTERISK>")
  .replace(/\\_/g, "<UNDERSCORE>")
  .replace(/\\~/g, "<TILDE>")
  .replace(/\\`/g, "<BACKTICK>")
  .replace(/\\\^/g, "<CARRET>")
  .replace(/\\\\/g, "<BACKSLASH>")

  // blockquote
  .replace(/>\s(.*?)<br>/g, "<div class='blockquote'>$1</div>")

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
    const url = c.match(/\((.*?)\)/g)[0];
    return `<img src="${url.substring(1, url.length - 1)}" alt="${content.substring(1, content.length - 1)}" id="${uuid}" style="width: 100%;"><label class="document-content-label" for="${uuid}">${content.substring(1, content.length - 1)}</label>`
  })

  // video and embed
  .replace(/(\$|&)\[(.*?)\]\((.*?)\)/g, (c) => {
    const uuid = uuid4();
    const content = c.match(/\[(.*?)\]/g)[0];
    const url = c.match(/\((.*?)\)/g)[0];
    const height = content.substring(1, content.length - 1);
    return `<iframe id="${uuid}" src="${url.substring(1, url.length - 1)}" width="100%" height="${height}%" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>`
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
  .replace(/<br>---/g, "<br><hr>")

  // unordered list
  .replace(/(&nbsp;){8}- (.*?)(?:(?!<br>).)*/g, (c) => {
    const content = c.substring(6 + 42 + 2);
    return `<ul><li style="list-style: none; margin-top: -1.5em"><ul><li>${content}</li></ul></li></ul>`;
  })
  .replace(/<br>- (.*?)(?:(?!<br>).)*/g, (c) => {
    const content = c.substring(6);
    return `<ul><li>${content}</li></ul>`;
  })
  .replace(/<\/ul><br>/g, "</ul><rbr>")
  
  // ordered list
  .replace(/(&nbsp;){8}\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
    const number = c.match(/\d{1,3}\./g)[0];
    const content = c.substring(c.indexOf(/\d{1,3}/g) + 6 + number.length + 44);
    return `<ul style="margin-top: -1.5em"><li style="list-style: none"><ol start="${number}"><li>${content}</li></ol></li></ul>`;
  })
  .replace(/<br>\d{1,3}\.\ (.*?)(?:(?!<br>).)*/g, (c) => {
    const number = c.match(/\d{1,3}/g)[0];
    const content = c.substring(c.indexOf(/\d{1,3}/g) + 5 + number.length + 2);
    return `<ol start="${number}"><li>${content}</li></ol>`;
  })
  .replace(/<\/ol><br>/g, "</ol><rbr>")

  // headers
  .replace(/#{5}\s?(.*?)<br>/g, "<h5>$1</h5><rbr>")
  .replace(/#{4}\s?(.*?)<br>/g, "<h4>$1</h4><rbr>")
  .replace(/#{3}\s?(.*?)<br>/g, "<h3>$1</h3><rbr>")
  .replace(/#{2}\s?(.*?)<br>/g, "<h2>$1</h2><rbr>")
  .replace(/#{1}\s?(.*?)<br>/g, "<h1>$1</h1><rbr>")

  // table
  .replace(/(<br>\|\s?(.*?)\s?\|(?:(?!<br>).)*){2,}/g, (c) => {
    let rows = c.split('<br>').slice(1);
    const headers = "<tr>" + rows.shift().split('|').slice(1, -1).map((header) => `<th><center>${header.trim()}</center></th>`).join("") + "</tr>";
    const rows_html = rows.map((row) => "<tr>" + (row.split('|').slice(1, -1).map((cell) => row.endsWith('!') ? `<td><center>${cell.trim()}</center></td>` : row.endsWith('$') ? `<td class="table-rig  ht-align">${cell.trim()}</td>` : `<td>${cell.trim()}</td>`).join("")) + "</tr>").join("");
    return `<table>${headers}${rows_html}</table>`;
  })

  // right-align brackets
  .replace(/\{\{(.*?)\}\}/g, "<div style='text-align: right;'>$1</div>")
  
  // center brackets
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
    const footnote_uuid = footnote_uuids[footnote_id].trim();
    return `<span class="footnote-top" onclick="show_footnote('${footnote_uuid}')"><sup>[${footnote_id}]</sup></span>`;
  })

  // superscript
  .replace(/\^(.*?)\^/g, "<sup>$1</sup>")

  // escape characters
  .replace(/<HASHTAG>/g, "#")
  .replace(/<ASTERISK>/g, "*")
  .replace(/<UNDERSCORE>/g, "_")
  .replace(/<TILDE>/g, "~")
  .replace(/<BACKTICK>/g, "`")
  .replace(/<CARRET>/g, "^")
  .replace(/<BACKSLASH>/g, "\\")

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
  showSpinner();
  let text = notepad.value;
  if (text === previousText) {
    hideSpinner();
    setSaveStatus("saved");
    return;
  }

  setSaveStatus("saving");

  text = text.trimEnd();
  
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

  // set the document div to the new html
  doc.innerHTML = `<div id="footnotes-alert-placeholder"></div>${html}`;

  // set the previous html to the new html
  previousHTML = JSON.parse(JSON.stringify({html})).html; // deepcopy

  const email = JSON.parse(getCookie("nmd-validation")).email.replace(/\./g, ",");

  // check for checkboxes
  (async () => {
    let checkboxes = Array.from(doc.querySelectorAll("input[type='checkbox']"));
    if (checkboxes.length) {
      // delete previous checkbox data
      fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/checkboxes/${document_uuid}/${email}.json`, {
        method: "DELETE",
      });
    
      checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
          updateCheckbox(email, event.target.id, event.target.checked);
        });

        // upload checkbox data
        fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/checkboxes/${document_uuid}/${email}/${checkbox.id}.json`, {
          method: "PUT",
          body: JSON.stringify(checkbox.checked ? 1 : 0)
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
      content: html,
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

  hideSpinner();
  setSaveStatus("saved");
}

function getStartAndEndPositions() {
  return { start: notepad.selectionStart, end: notepad.selectionEnd };
}

let location_before_last_insert = [ { start: 0, end: 0 } ];

function insertText(text, cursor_movement = 0) {
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
  }
});

async function check_for_changes() {
  if (previousText.trim() !== notepad.value.trim()) {
    setSaveStatus("not-saved");
    previousText === notepad.value;
  }
}

document.getElementById("notepad").addEventListener("keydown", (event) => {
  check_for_changes();
  const sel = window.getSelection().toString();
  
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

  // replace tab with \t
  if (event.key === "Tab") {
    event.preventDefault();
    setSaveStatus("not-saved");
    insertText("\t");
  }
  
  if (event.altKey) {
    switch (event.code) {
      // horizontal rule
      case "KeyR":
        event.preventDefault();
        insertText("---");
        break;

      // video
      case "KeyV":
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
        break;

      // lists
      case "KeyL":
        if (event.shiftKey) {
          event.preventDefault();
          insertText("1. \n2. \n3. ", -8);
        } else {
          event.preventDefault();
          insertText("- \n- \n- ", -6);
        }
        break;
      
      // checkbox
      case "KeyC":
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
        break;

      // strikethrough
      case "KeyS":
        if (event.ctrlKey) break;
        event.preventDefault();
        if (sel.length === 0) {
          insertText("~~~~", -2);
        } else if (notepad.value.includes(sel)) {
          insertText(`~~${sel}~~`, 0);
        }
        break;

      // highlight
      case "KeyH":
        event.preventDefault();
        if (sel.length === 0) {
          insertText("``", -1);
        } else if (notepad.value.includes(sel)) {
          insertText(`\`${sel}\``, 0);
        }
        break;
      
      // table
      case "KeyT":
        event.preventDefault();
        insertText("|  | title2 | title3 |\n| content1 | content2 | content3 |", -55);
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
    }
  }

  if (event.ctrlKey) {
    switch (event.code) {
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
          // hyperlink
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
        }
        break;

      // copy line is there is no currently selected text
      case "KeyC":
        if (notepad.selectionStart === notepad.selectionEnd) {
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

      // pink color (pink bold)
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

      // highlight
      case "KeyH":
        event.preventDefault();
        if (sel.length === 0) {
          insertText("``", -1);
        } else if (notepad.value.includes(sel)) {
          insertText(`\`${sel}\``, 0);
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

      // superscript
      case "Period":
        event.preventDefault();
        if (sel.length === 0) {
          insertText("^^", -1);
        } else if (notepad.value.includes(sel)) {
          insertText(`^${sel}^`, 0);
        }
        break;

      // center align
      case "BracketLeft":
        event.preventDefault();
        if (sel.length === 0) {
          insertText("{}", -1);
        } else if (notepad.value.includes(sel)) {
          insertText(`{${sel}}`, 0);
        }
        break;

      // right align
      case "BracketRight":
        event.preventDefault();
        if (sel.length === 0) {
          insertText("{{}}", -2);
        } else if (notepad.value.includes(sel)) {
          insertText(`{{${sel}}}`, 0);
        }
        break;
    }
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
    documentData.title = "Unt itled Document";
    document_title.style.color = "tomato";
  } else {
    documentData.title = new_title;
    document_title.style.color = "#0d6efd";
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
  return compileMarkdown(notepad.value.trimEnd());
}

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
  </head>
  <body>
    <div id="footnotes-alert-placeholder"></div>
    <svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
      <symbol id="info-fill" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
      </symbol>
    </svg>
    ${getHtml()}
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

document.getElementById("copy-html-btn").addEventListener('click', () => {
  navigator.clipboard.writeText(getHtml());
});

document.getElementById("copy-md-btn").addEventListener('click', () => {
  navigator.clipboard.writeText(notepad.value.trim());
});

document.getElementById("download-notepad-as-txt-btn").addEventListener('click', () => {
  download(notepad.value.trim(), `${documentData.title}.txt`);
});

document.addEventListener('keydown', (e) => {
  if (!e.altKey) return;

  if (e.code === "Digit1") {
    e.preventDefault();
    if (NOTEPAD_DISABLED) return;
    if (doc.dataset.fullscreen === "true" ? true : false) {
      // exit fullscreen
      document.querySelector(".dropleft > span").click();
    }
    document.querySelector("main div > span").click();
  }
  
  if (e.code === "Digit2") {
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

doc.addEventListener*('keydown', (e) => {
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

/* notepad fullscreen - Alt+1 */

document.querySelector("main div > span").addEventListener('click', () => {
  if (NOTEPAD_DISABLED) return;
  const notepad_fullscreen = notepad.dataset.fullscreen === "true" ? true : false;
  
  if (!notepad_fullscreen) {
    notepad.style.position = "fixed";
    notepad.style.width = "98.75vw";
    notepad.style.height = "calc(95vh - 2.8em)";
    notepad.style.zIndex = "1000";

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
  if (!doc_fullscreen) {
    doc.style.position = "absolute";
    doc.style.top = "0";
    doc.style.left = "0";
    doc.style.width = "100vw";
    doc.style.height = "95vh";
    
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

doc.addEventListener*('keydown', (e) => {
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

document.body.addEventListener('keydown', (e) => {
  if (e.code === "Escape" && document.getElementById("footnotes-alert-placeholder").innerHTML !== "") {
    e.preventDefault();
    document.getElementById("footnotes-alert-placeholder").innerHTML = "";
    return;
  }

  // title
  if (e.altKey && e.shiftKey && e.code === "KeyT") {
    document.querySelector("document-title").click();
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
  if (e.ctrlKey && e.altKey && e.code === "KeyS") {
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
    
    const text = doc.innerText || clean(notepad.value);
    const character_count = text.replace(/\n/g, " ").length;

    const wordOccurrence = string => {
      let map = {};
      const words = string.replace(/\n/g, " ").replace(/\./, " ").replace(/,/, " ").split(" ").map(word => word.replace(/\./g, " ").replace(/,/g, " ").toLowerCase().trim()).filter(word => word !== "" && isNaN(word));

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

    const sentences = text.split(".").map(sentence => sentence.replace(/\n/, " ")).filter(sentence => sentence.length >= 7);
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
    printDiv("document");
  }
});

window.onbeforeunload = () => {
  if (notepad.value.trim() !== "" && document.getElementById("save-status").innerText !== "No New Changes") {
    return "Are you sure you want to leave? Your changes will not be saved.";
  }
}

document.getElementById("copy-share-link-btn").addEventListener('click', () => {
  navigator.clipboard.writeText(`https://notes.mzecheru.com/document/?id=${document_uuid}&mode=view`);
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

function printDiv(divName) {
  // delete alert if it's open
  document.getElementById("footnotes-alert-placeholder").innerHTML = "";
  var printContents = document.getElementById(divName).innerHTML;
  document.body.innerHTML = printContents;
  window.print();
  window.location.reload();
}

document.getElementById("print-document-btn").addEventListener('click', () => {
  printDiv("document");
});

document.getElementById('file-upload-modal-confirm-btn').addEventListener('click', () => {
  for (var i = 0, f; f = files[i]; i++) {
    const reader = new FileReader();
    reader.readAsText(f);
    
    reader.onload = () => {
      document.getElementById('notepad').value = reader.result;
      saveDocument();
    }
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
  if (e.target.parentElement.innerText.replace(/✖/g, "") === email.replace(/,/g, ".")) {
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
  theme_ele.value = documentData.theme || "light";
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

  documentData.authors?.forEach(author => {
    createTag(author.replace(/,/, "."));
  });

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


document.getElementById("settings-modal-save-btn").addEventListener('click', () => {
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

// initialize popovers
[...document.querySelectorAll('[data-bs-toggle="popover"]')].forEach(el => new bootstrap.Popover(el))