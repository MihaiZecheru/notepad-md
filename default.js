function getCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function setCookie(name, value, days = 28265) {
  var expires = "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString() + ";";
  }
  document.cookie = name + "=" + (value || "") + expires + "path=/";
}

function deleteCookie(name) {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
}

async function getDocumentIds(email) {
  const req = await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents_id_list/${email.replace(/\./g, ",")}.json`, {
    method: "GET"
  }).then((r) => r.json());

  if (req === null) return [];
  return Object.values(req);
}

const loggedIn = getCookie("nmd-validation");

const left_button = document.getElementById("login-btn-footer") || document.getElementById("documents-btn-footer");
const right_button = document.getElementById("register-btn-footer") || document.getElementById("switch-account-btn-footer");

let left_button_redirect = "/account/login/";
let right_button_redirect = "/account/register/";
let center_image_and_text_redirect = "/";

if (loggedIn) {
  left_button.innerText = "Documents";
  right_button.innerText = "Switch Accounts";
  left_button.id = "documents-btn-footer";
  right_button.id = "switch-account-btn-footer";
  left_button_redirect = "/account/me/documents/";
  right_button_redirect = "#";
  center_image_and_text_redirect = "/account/me/";
}

left_button.addEventListener("click", () => {
  window.location.href = left_button_redirect;
});

right_button.addEventListener("click", () => {
  window.location.href = right_button_redirect;
  if (loggedIn) {
    /*
      <div class="modal fade" id="switch-accounts-modal" tabindex="-1" aria-labelledby="switch-accounts-modal-label" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="switch-accounts-modal-label">Switch Accounts</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <select class="form-select" aria-label="${email}">
                <option selected>${email}</option>
                <option selected>${email}</option>
                <option selected>${email}</option>
                <option selected>${email}</option>
              </select>  
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" data-bs-dismiss="modal" id="switch-accounts-btn">Switch Account</button>
              <button type="button" class="btn btn-success" data-bs-dismiss="modal" id="add-account-btn">Add Account</button>
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    */
    const accounts = JSON.parse(getCookie("nmd-accounts")) || [];
    const email = JSON.parse(getCookie('nmd-validation')).email;

    let select_options = "";
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      if (account !== email) {
        select_options += `<option value="${account}">${account}</option>`;
      }
    }

    let ele = document.createElement("div");
    ele.classList.add("modal", "fade");
    ele.tabIndex = -1;
    ele.setAttribute("aria-labelledby", "switch-accounts-modal-label");
    ele.setAttribute("aria-hidden", "true");
    ele.id = "switch-accounts-modal";
    ele.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="switch-accounts-modal-label">Switch Accounts</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <select class="form-select" aria-label="${email}">
            <option selected>${email}</option>
            ${select_options}
          </select>
        </div>
        <div class="modal-footer" style="padding-left: 0; padding-right: 0; display: flex; justify-content: space-evenly;">
          <button type="button" class="btn btn-primary" data-bs-dismiss="modal" id="switch-accounts-btn">Switch Account</button>
          <button type="button" class="btn btn-success" data-bs-dismiss="modal" id="add-account-btn">Add Account</button>
          <button type="button" class="btn btn-danger" data-bs-dismiss="modal" id="switch-accounts-modal-logout-btn">Logout</button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(ele);
    document.getElementById("switch-accounts-modal-logout-btn").addEventListener("click", () => {
      deleteCookie("nmd-validation");
      deleteCookie("documents");
      window.sessionStorage.removeItem("already-updated");
      window.location.href = "/account/login/";
    });
    document.querySelector("select").addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        document.getElementById("switch-accounts-btn").click();
      }
    });
    document.getElementById("switch-accounts-btn").addEventListener('click', async () => {
      const option = document.querySelector("#switch-accounts-modal select").value;
      if (option === email) return;

      document.querySelectorAll("button").forEach((ele) => {
        ele.setAttribute("disabled", "true");
        ele.style.pointerEvents = "none";
        ele.style.cursor = "wait";
      });
      document.querySelectorAll("a").forEach((ele) => {
        ele.setAttribute("disabled", "true");
        ele.style.pointerEvents = "none";
        ele.style.cursor = "wait";
      });
      document.body.classList.add("disable-highlighting");
      document.body.style.cursor = "wait";
      document.body.style.userSelect = "none";
      document.body.style.opacity = "0.5";
      
      // get password
      const { password, created_on } = await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/users/${option.replace(/\./g, ",")}.json`, {
        method: 'GET'
      }).then(r => r.json());

      // login
      const d = new Date(); const today = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      await getDocumentIds(option).then(async (documentIds) => {
        deleteCookie("nmd-validation");
        deleteCookie("documents");
        await new Promise((_r) => {
          setTimeout(_r, 750);
        })
        setCookie("nmd-validation", JSON.stringify({ email: option, password, created_on, last_active: today, document_count: documentIds.length }));
        setCookie("documents", JSON.stringify(documentIds));
        document.body.style.cursor = "default";
        window.location.reload();
      });
      document.body.removeChild(ele);
    });
    document.getElementById("add-account-btn").addEventListener('click', () => {
      // logout
      deleteCookie("nmd-validation");
      deleteCookie("documents");
      window.sessionStorage.removeItem("already-updated");
      // go to login to add account
      window.location.href = "/account/login/";
    });
    new bootstrap.Modal(ele).show();
  }
});

document.querySelectorAll("#footer span:not(.material-symbols-outlined)")[1].addEventListener("click", () => {
  window.location.href = center_image_and_text_redirect;
});

document.getElementById("notepad-redirect").href = center_image_and_text_redirect;