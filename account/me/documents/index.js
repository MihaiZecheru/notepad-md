import { getCookie } from "/modules/cookies.mjs";
import { max_card_body_length, max_title_length } from "../../../modules/max_lengths.mjs";

let email, password;

// take input and capitalize first letter of each word
function title(sentence) {
  return sentence.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

if (!getCookie("nmd-validation")) window.location.href = "/account/login/";
else {
  const cookie = JSON.parse(getCookie("nmd-validation"));
  email = cookie.email.replace(/,/g, ".");
  password = cookie.password;
  document.querySelector("div#header h1").innerText = title(email + "'s documents");
}

async function getDocuments(start, amount) {
  const document_uuids = JSON.parse(getCookie("documents")).slice(start, start + amount);
  let documents = [];

  if (!document_uuids) {
    document.querySelector("div#documents").innerHTML = `<h2>No documents found</h2>`;
    return;
  }

  // get 5 documents
  for (let i = 0; i < document_uuids.length; i++) {
    await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents/${document_uuids[i]}.json`, {
      method: "GET",
      headers: {
        "Access-Control-Allow-Origin":  "http, https",
        "Access-Control-Allow-Methods": "PUT, GET, POST, DELETE, OPTONS",
        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization",
        "Content-Type": "application/json"
      }
    }).then(r => r.json()).then(d => documents.push({ id: document_uuids[i], ...d }));
  }

  return { documents, remaining: JSON.parse(getCookie("documents")).length - document_uuids.length };
}

function isLetter(c) {
  return c.toLowerCase() != c.toUpperCase();
}

function parseText(text, cutoff = false) {
  //          remove all <></> tags                   remove all <> tags     remove cut-off <> tags
  text = text.replace(/<(.*?)>(.*?)<\/(.*?)>/g, "$2").replace("<(.*?)>", "").replace(/<(.*)/g, "").replace(/<br>/g, " ").replace(/\s\s/g, " ");
  while (!isLetter(text.substring(text.length - 1)))
    text = text.substring(0, text.length - 1);
  return text + (cutoff ? "..." : "");
}

function createCards(documents) {
  documents.forEach((doc) => {
    if (!doc.content) doc.content = "";
    let ele = document.createElement("div");
    ["card", "shadow", "mb-5", "bg-body", "rounded"].forEach(cls => ele.classList.add(cls));
    ele.innerHTML = 
    `<div class="card-body">
        <span class="card-title"><a href="/document/?id=${doc.id}" class="btn btn-primary document-title-btn">${doc.title.length > max_title_length ? doc.title.substring(0, max_title_length) + "..." : doc.title}</a></span>
        <p class="card-text">${doc.content.length > max_card_body_length ? parseText(doc.content.substring(0, max_card_body_length), true) : parseText(doc.content)}</p>
        
      </div>
      <div class="card-footer user-select-none">
        <small class="text-muted">Last visited ${doc.last_visit}</small>
    </div>`;
    const ele_to_remove = document.querySelector("div.skeleton-card");
    ele_to_remove.after(ele);
    document.querySelector("main").removeChild(ele_to_remove);
  });
}

function removeSkeletonCards() {
  document.querySelectorAll("div.skeleton-card").forEach(ele => ele.remove());
}

getDocuments(0, 5).then((r) => {
  createCards(r.documents);

  if (r.remaining > 0) {
    getDocuments(5, r.remaining).then((r) => {
      createCards(r.documents);
      removeSkeletonCards();
    });
  } else {
    removeSkeletonCards();
  }
});