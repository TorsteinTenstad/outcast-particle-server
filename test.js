const main = async () => {
  await fetch('http://localhost:8000/score', {
    method: 'POST',
    body: JSON.stringify({ username: 'magne', score: 999 }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result = await (
    await fetch('http://localhost:8000/score/?username=magne', {
      method: 'GET',
    })
  ).text();
  console.log(result);
};

main();
