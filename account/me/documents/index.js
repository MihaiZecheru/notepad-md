'use strict';

import { setCookie, getCookie } from "/modules/cookies.mjs";
import { max_title_length } from "../../../modules/max_lengths.mjs";

let email, password;

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
    document.getElementById("searchbox").focus();
  } else if (event.code === "Escape") {
    document.getElementById("searchbox").blur();
  }
});

document.getElementById("searchbox").addEventListener("input", (e) => {
  const search = e.target.value.toLowerCase();
  if (search.length > 0) {
    document.querySelectorAll("div.card").forEach((card) => {
      const title = card.querySelector("span.card-title").innerText.toLowerCase();
      const content = card.querySelector("p.card-text").innerText.toLowerCase();
      if (title.includes(search) || content.includes(search)) card.style.display = "flex";
      else card.style.display = "none";
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
if (missing_id) {
  new bootstrap.Modal(document.getElementById("missing-id-error-modal")).show();
} else if (invalid_id) {
  new bootstrap.Modal(document.getElementById("invalid-id-error-modal")).show();
}

document.getElementById("okay1").addEventListener("click", () => {
  window.history.replaceState({}, document.title, "/account/me/documents/");
});

document.getElementById("okay2").addEventListener("click", () => {
  window.history.replaceState({}, document.title, "/account/me/documents/");
});

let documents_ = [];
const main = document.querySelector("main");

const modal_new_title_input = document.querySelector("#new-title");
let DOC_BEING_RENAMED;
let DOC_BEING_DELETED;

async function createCard(doc) {
  if (!doc.content) doc.content = "";
  let ele = document.createElement("div");
  ["card", "shadow", "mb-5", "bg-body", "rounded"].forEach(cls => ele.classList.add(cls));
  ele.innerHTML = 
  `<div class="card-body" id="${doc.id}">
  <span class="card-title"><a href="/document/?id=${doc.id}" class="btn btn-primary document-title-btn">${doc?.title?.length > max_title_length ? doc?.title?.substring(0, max_title_length) + "..." : doc?.title ? doc.title : "DELETED DOCUMENT"}</a></span>
  <p class="card-text">${parseText(doc.content)}</p>
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

  ele.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    new BootstrapMenu(`#${doc.id}`, {
      actions: [{
        name: "Edit",
        onClick: () => {
          window.location.href = `/document/?id=${doc.id}&mode=edit`;
        }
      }, {
        name: "View",
        onClick: () => {
          window.location.href = `/document/?id=${doc.id}&mode=view`;
        }
      }, {
        name: "Copy Share Link",
        onClick: () => {
          navigator.clipboard.writeText(`https://notes.mzecheru.com/document/?id=${doc.id}&mode=view`);
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

document.querySelector("#delete-modal").addEventListener("click", () => {
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
