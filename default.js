document.getElementById("login-btn-footer").addEventListener("click", () => {
  window.location.href = "/account/login/";
});

document.getElementById("register-btn-footer").addEventListener("click", () => {
  window.location.href = "/account/register/";
});

document.querySelectorAll("#footer span")[1].addEventListener("click", () => {
  window.location.href = "/";
});