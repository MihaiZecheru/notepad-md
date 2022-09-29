function show_footnote(ele_id) {
  const txt = document.getElementById(ele_id).innerText;
  const doc_ = document.getElementById("document");
  const docScrollbarWidth = doc_.offsetWidth - doc_.clientWidth;
  document.getElementById("footnotes-alert-placeholder").innerHTML = `
  <div class="alert alert-primary d-flex align-items-center mt-2 mb-2 alert-dismissible" style="position: fixed; z-index: 5000; width: ${doc_.dataset.fullscreen === "true" ?
    `calc(100% - ` + document.querySelector(".dropleft > span").offsetWidth + 'px - .5em - ' + docScrollbarWidth + 'px)' :
    'calc(48vw - (1.3rem) - ' + docScrollbarWidth + 'px)'};" role="alert" id="footnote-alert">
    <svg class="bi flex-shrink-0 me-2" width="24" height="24" role="img" aria-label="Info:"><use xlink:href="#info-fill"/></svg>
    <div id="footnote-alert-text">
      ${txt.substring(txt.indexOf(" ") + 1)}
    </div>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  </div>`;
}