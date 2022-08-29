export async function getDocumentIds(email) {
  const req = await fetch(`https://notepad-md-32479-default-rtdb.firebaseio.com/documents_id_list/${email.replace(/\./g, ",")}.json`, {
    method: "GET",
    headers: {
      "Access-Control-Allow-Origin":  "http, https",
      "Access-Control-Allow-Methods": "PUT, GET, POST, DELETE, OPTONS",
      "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      "Content-Type": "application/json"
    }
  }).then((r) => r.json());

  if (req === null) return [];
  return Object.values(req);
}