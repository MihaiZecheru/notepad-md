export async function getDocumentIds(email) {
  const req = await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents_id_list/${email.replace(/\./g, ",")}.json`, {
    method: "GET"
  }).then((r) => r.json());

  if (req === null) return [];
  return Object.values(req);
}