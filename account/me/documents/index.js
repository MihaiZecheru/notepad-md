'use strict';

import { setCookie, getCookie } from "/modules/cookies.mjs";
import { max_title_length } from "../../../modules/max_lengths.mjs";

// do not remove this password var; it is used further down
let email, password;

function compileMarkdown(text, docType, indentSize, language) {
  // create a unique id for each set of footnotes in the document
  const footnote_ids = get_footnote_ids();
  let footnote_uuids = {};
  for (let i = 0; i < get_footnote_count(); i++) {
    footnote_uuids[footnote_ids[i]] = uuid4();
  }

  // add new line to the bottom so that blockquotes at the bottom of the document get recognized, and to the top so lists at the top get recognized
  text = "\n" + text + "\n";

  // tab
  if (docType !== "code") {
    switch (indentSize) {
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

  if (docType === "markdown") {
    let html = text.replace(/\n/g, "<br>")

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

    // right-align brackets
    .replace(/\{\{(.*?)\}\}<br>/g, "<div style='text-align: right;'>$1</div><rbr>")
    
    // center brackets
    .replace(/\{(.*?)\}<br>/g, "<center>$1</center><rbr>")

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

    html = html.replace(/&gt;/g, ">").replace(/&lt;/g, "<");

    if (html.startsWith("<br>")) {
      html = html.substring(4, html.length);
    }
    
    if (html.endsWith("<br>")) {
      return html.substring(0, html.length - 4);
    }
  
    return html;
  } else if (docType === "code") {
    // <pre><code class="language-python">HTML</code></pre>
    const lang = langs[language];
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.classList.add("language-" + lang);
    code.textContent = text.replace(/&gt;/g, ">").replace(/&lt;/g, "<");;
    pre.appendChild(code);
    return pre.outerHTML;
  }
}

if (!getCookie("nmd-validation")) window.location.href = "/account/login/?redirect=documents";
else {
  const cookie = JSON.parse(getCookie("nmd-validation"));
  email = cookie.email.replace(/,/g, ".");
  password = cookie.password;
  document.querySelector("div#header h1").innerText = "Documents: " + email;
}

document.body.addEventListener("keydown", (event) => {
  if ((event.ctrlKey && event.shiftKey && event.code === "KeyK") || (event.ctrlKey && event.code === "KeyF")) {
    event.preventDefault();
    document.getElementById("searchbox").select();
  } else if (event.code === "Escape") {
    document.getElementById("searchbox").blur();
  }
});

document.getElementById("searchbox").addEventListener("click", () => {
  document.getElementById("searchbox").select();
})

document.getElementById("searchbox").addEventListener("input", (e) => {
  const search = e.target.value.toLowerCase();
  if (search.length > 0) {
    document.querySelectorAll("div.card").forEach((card) => {
      const title = card.querySelector("span.card-title").innerText.toLowerCase();
      const content = card.querySelector("p.card-text").innerText.toLowerCase(); // if the card body is the desc then this will be the description
      const description = card.querySelector("p.card-text").attributes.getNamedItem('data-content')?.value || ""; // so this is getting the content
      if (title.includes(search) || content.includes(search) || description.includes(search)) card.style.display = "flex";
      else {
        if (card.id !== "create-new-document-card") card.style.display = "none";
      }
    });
  } else {
    document.querySelectorAll("div.card").forEach((card) => {
      card.style.display = "flex";
    });
  }
});

// check for errors on /document/ page
const urlParams = new URLSearchParams(window.location.search);
const missing_id = urlParams.get("error") === "missing_id" && urlParams.get("id") === "null";
const invalid_id = urlParams.get("error") === "invalid_id";
const private_document = urlParams.get("error") === "private_document";
if (missing_id) {
  new bootstrap.Modal(document.getElementById("missing-id-error-modal")).show();
} else if (invalid_id) {
  new bootstrap.Modal(document.getElementById("invalid-id-error-modal")).show();
} else if (private_document) {
  new bootstrap.Modal(document.getElementById("private-document-error-modal")).show();
}

document.getElementById("okay1").addEventListener("click", () => {
  window.history.replaceState({}, document.title, "/account/me/documents/");
});

document.getElementById("okay2").addEventListener("click", () => {
  window.history.replaceState({}, document.title, "/account/me/documents/");
});

document.getElementById("okay3").addEventListener("click", () => {
  window.history.replaceState({}, document.title, "/account/me/documents/");
});

let documents_ = [];
const main = document.querySelector("main");

const modal_new_title_input = document.querySelector("#new-title");
let id_for_share_link_modal;
let DOC_BEING_RENAMED;
let DOC_BEING_DELETED;

async function createCard(doc) {
  const content = doc?.description || doc.content || "";

  let ele = document.createElement("div");
  ["card", "shadow", "mb-5", "bg-body", "rounded"].forEach(cls => ele.classList.add(cls));
  ele.innerHTML = 
  `<div class="card-body" id="${doc.id}">
  <span class="card-title"><a href="/document/?id=${doc.id}" class="btn btn-primary document-title-btn">${doc?.title?.length > max_title_length ? doc?.title?.substring(0, max_title_length) + "..." : doc?.title ? doc.title : "DELETED DOCUMENT"}</a></span>
  <p class="card-text"${doc.description ? " data-content=" + doc.content : ""}>${content.replace(/\n/g, "<br>")}</p>
  </div>

  <div class="card-footer user-select-none">
  <small class="text-muted">Last visited ${doc.last_visit}</small>
  </div>`;
  const ele_to_remove = document.querySelector("div.skeleton-card");
  if (ele_to_remove) {
    ele_to_remove?.after(ele);
    main.removeChild(ele_to_remove);
  } else {
    main.appendChild(ele);
  }
  documents_.push(doc);

  const preview = () => {
    document.getElementById("preview-document-modal-title").innerText = doc.title;
    document.getElementById("preview-document-modal-content").innerHTML = `
    <style>
      /* move checkboxes closer together */
      .nmd-checkbox {
        margin-bottom: -1rem!important;
      }

      .nmd-checkbox > input {
        cursor: not-allowed; /* checkboxes will not work during preview mode */
      }
      
      .nmd-checkbox > label {
        text-align: left;
      }
      
      table {
        font-family: arial, sans-serif;
        border-collapse: collapse;
        width: 100%;
      }
      
      td, th {
        border: 1px solid #dddddd;
        text-align: left;
        padding: 8px;
      }
      
      tr:nth-child(even) {
        background-color: #dddddd;
      }
      
      tr:nth-child(even) td:not(td:last-child) {
        border-right: 1px solid whitesmoke;
      }
      
      .table-right-align {
        text-align: right;
      }
      
      .document-content-label {
        width: 100%;
        text-align: right;
      } 
      
      ul, ol {
        margin-bottom: 0;
      }
      
      div.blockquote {
        margin-bottom: 0;
        border-left: 0.25rem solid #477bff;
        padding-left: 0.5rem; 
      }
      
      .footnote-top {
        cursor: pointer;
        color: #0d6efd;
      }
      
      h1, h2, h3, h4, h5 {
        margin-bottom: 0;
      }
      
      hr {
        margin: 0;
      }
    </style>` + doc.content;

    document.querySelectorAll(".nmd-checkbox > input").forEach((checkbox) => {
      checkbox.addEventListener("click", (e) => {
        e.preventDefault();
        checkbox.blur();
      });
    });

    document.getElementById("preview-document-modal").addEventListener("contextmenu", (e) => {
      e.preventDefault();
      new BootstrapMenu('#preview-document-modal', {
        actions: [{
          name: 'Document Summary',
          onClick: () => {
            document.getElementById("preview-document-modal-close-btn").click();
            const text = document.getElementById("preview-document-modal-content").innerText.substring(1296); // 1296 is the text from the style tag
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
            document.getElementById("word-count-modal-body").addEventListener("contextmenu", (e) => {
              e.preventDefault();
              new BootstrapMenu('#word-count-modal-body', {
                actions: [{
                  name: 'Back to Preview',
                  onClick: () => {
                    document.getElementById("word-count-modal-close-btn").click();
                    preview();
                  }
                }]
              });
            });
            new bootstrap.Modal(document.getElementById("word-count-modal")).show();
          }}]
      });
    });

    document.getElementById("open-edit-modal-btn").onclick = () => {
      window.location.href = `/document/?id=${doc.id}&mode=edit`;
    };
    document.getElementById("open-view-modal-btn").onclick = () => {
      window.location.href = `/document/?id=${doc.id}&mode=view`;
    };
    new bootstrap.Modal("#preview-document-modal").show();
  }

  ele.addEventListener("click", (event) => {
    if (event.ctrlKey) {
      if (event.target.tagName === "A") {
        return;
      }
      preview();
    }
  })

  ele.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    new BootstrapMenu(`#${doc.id}`, {
      actions: [{
        name: "Preview",
        onClick: preview
      }, {
        name: 'Summary',
        onClick: () => {
          document.getElementById("preview-document-modal-close-btn").click();
          const text = doc.content;
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
          document.getElementById("word-count-modal-body").addEventListener("contextmenu", (e) => {
            e.preventDefault();
            new BootstrapMenu('#word-count-modal-body', {
              actions: [{
                name: 'Back to Preview',
                onClick: () => {
                  document.getElementById("word-count-modal-close-btn").click();
                  preview();
                }
              }]
            });
          });
          new bootstrap.Modal(document.getElementById("word-count-modal")).show();
        }
      }, {
        name: "Open (Edit)",
        onClick: () => {
          window.location.href = `/document/edit/?id=${doc.id}&mode=edit`;
        }
      }, {
        name: "Open (View)",
        onClick: () => {
          window.location.href = `/document/view/?id=${doc.id}`;
        }
      }, {
        name: "Copy Share Link",
        onClick: () => {
          id_for_share_link_modal = doc.id;
          new bootstrap.Modal(document.getElementById("share-link-modal")).show();
        }
      }, {
        name: "Rename",
        onClick: () => {
          DOC_BEING_RENAMED = JSON.parse(JSON.stringify(doc));
          modal_new_title_input.value = doc.title;
          new bootstrap.Modal(document.getElementById("change-title-modal")).show();
          new Promise((_r) => setTimeout(_r, 500)).then(() => modal_new_title_input.select());
        }
      }, {
        name: 'Delete',
        onClick: () => {
          document.getElementById("delete-title").innerText = doc.title;
          DOC_BEING_DELETED = JSON.parse(JSON.stringify(doc));
          new bootstrap.Modal(document.getElementById("delete-modal")).show();
        }
      }]
    });
    return false;
  });
}

async function getDocumentsAsync() {
  const document_uuids = JSON.parse(getCookie("documents")).reverse();

  if (!document_uuids.length) {
    document.querySelector("main").innerHTML = `<div class="justify-content" style="width: 100%; margin-top: 1vh;"><h2>No documents found</h2></div>`;
    return;
  }

  // get documents
  for (let i = 0; i < document_uuids.length; i++) {
    createCard(await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuids[i]}.json`, {
      method: "GET"
    }).then(r => r.json()).then((d) => {
      return { id: document_uuids[i], ...d } 
    }));
  }
}

function isLetter(c) {
  return c.toLowerCase() != c.toUpperCase();
}

function parseText(text) {
  // remove all <></> tags
  text = text.replace(/<[^>]*>?/gm, ' ').replace(/<br>/g, " ").replace(/\s\s/g, " ");
  while (!isLetter(text.substring(text.length - 1)) && text.length > 0) {
    text = text.substring(0, text.length - 1);
  }
  return text;
}

function removeSkeletonCards() {
  document.querySelectorAll("div.skeleton-card").forEach(ele => ele.remove());
}

function last_reload_greater_than_15s_ago() {
  return sessionStorage.getItem("last_reload") ? Date.now() - sessionStorage.getItem("last_reload") > 15000 : true;
}

window.onbeforeunload = () => {
  if (documents_.length === JSON.parse(getCookie("documents")).length && !last_reload_greater_than_15s_ago()) {
    sessionStorage.setItem("documents", JSON.stringify(documents_));
  }
  sessionStorage.setItem("last_reload", Date.now());
}

async function checkForNewOrDeletedDocuments() {
  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents_id_list/${email.replace(/\./g, ",")}.json`, {
    method: 'GET'
  }).then(r => r.json()).then((d) => { 
    const document_uuids = Object.values(d);
    if (document_uuids.length !== JSON.parse(getCookie("documents")).length) {
      setCookie("documents", JSON.stringify(document_uuids));
      new bootstrap.Modal(document.getElementById("new-or-deleted-document-modal")).show();
    }
  });
}

document.getElementById("new-or-deleted-document-btn").addEventListener("click", () => {
  window.location.reload();
});

if (sessionStorage.hasOwnProperty("documents")) {
  const _documents = JSON.parse(sessionStorage.getItem("documents"))
  let documents = {};
  for (let i = 0; i < _documents.length; i++) {
    documents[_documents[i].id] = _documents[i];
  }
  checkForNewOrDeletedDocuments();
  const docs = JSON.parse(getCookie('documents')).reverse();
  // get new data on the previously used document
  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${docs[0]}.json`, {
    method: "GET"
  }).then(r => r.json()).then(d => { createCard({ id: docs[0], ...d }) }).then(() => {
    docs.forEach((id, i) => {
      if (i === 0) return;
      createCard(documents[id]);
    });
    sessionStorage.removeItem("documents");
    removeSkeletonCards();
  });
} else {
  checkForNewOrDeletedDocuments();
  getDocumentsAsync().then(() => {
    removeSkeletonCards();
  });
}

modal_new_title_input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    document.querySelector("#change").click();
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

document.querySelector("#change").addEventListener("click", () => {
  if (!DOC_BEING_RENAMED?.id) return;

  const new_title = modal_new_title_input.value.trim();
  if (new_title === DOC_BEING_RENAMED.title) return;

  // upload the new title to the server
  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${DOC_BEING_RENAMED.id}/title.json`, {
    method: "PUT",
    body: JSON.stringify(new_title)
  }).then(() => {
    sessionStorage.removeItem("documents"); // force reload
    sessionStorage.removeItem("last_reload");
    window.location.reload(); 
  });
});

document.getElementById("delete-doc-btn").addEventListener("click", () => {
  fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${DOC_BEING_DELETED.id}.json`, {
    method: "DELETE",
  }).then(() => {
    const cookie = JSON.parse(getCookie("nmd-validation"));
    setCookie("nmd-validation", JSON.stringify(cookie));
    
    fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents_id_list/${DOC_BEING_DELETED.owner}.json`, {
      method: "GET",
    }).then(r => r.json()).then((doc_list) => {
      const doc_to_delete = Object.entries(doc_list).find((entry) => entry[1] === DOC_BEING_DELETED.id)[0];
      fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents_id_list/${DOC_BEING_DELETED.owner}/${doc_to_delete}.json`, {
        method: "DELETE",
      }).then(() => {
        cookie.document_count--;
        fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${DOC_BEING_DELETED.owner}/document_count.json`, {
          method: "PUT",
          body: JSON.stringify(cookie.document_count)
        }).then(() => {
          setCookie("nmd-validation", JSON.stringify(cookie));
          let documents = JSON.parse(getCookie("documents"));
          documents = documents.filter(doc_ => doc_ !== DOC_BEING_DELETED.id);
          setCookie("documents", JSON.stringify(documents));
          documents_ = documents_.filter(doc_ => doc_.id !== DOC_BEING_DELETED.id);
          document.getElementById(DOC_BEING_DELETED.id).parentElement.remove();
          // update document count on the make new document card
          document.querySelector("#document-count").innerText = cookie.document_count;
        });
      });
    });
  });
});

function showSnackBar() {
  var sb = document.getElementById("snackbar");
  sb.className = "show";
  setTimeout(()=>{ sb.className = sb.className.replace("show", ""); }, 3000);
}

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
  document.getElementById("share-link-input").value = `https://notes.mzecheru.com/document/view/id=?${id_for_share_link_modal}`;
  setGreen(document.getElementById("share-view-link"));
  document.getElementById("share-view-link").blur();
});

document.getElementById("share-edit-link").addEventListener('click', () => {
  document.getElementById("share-link-input").value = `https://notes.mzecheru.com/document/edit/id=?${id_for_share_link_modal}`;
  setGreen(document.getElementById("share-edit-link"));
  document.getElementById("share-edit-link").blur();
});

document.getElementById("share-copy-link").addEventListener('click', () => {
  document.getElementById("share-link-input").value = `https://notes.mzecheru.com/document/copy/id=?${id_for_share_link_modal}`;
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

// initialize popovers
[...document.querySelectorAll('[data-bs-toggle="popover"]')].forEach(el => new bootstrap.Popover(el));