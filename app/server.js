const express = require('express');

const app = express();
const port = Number(process.env.PORT || 8000);

app.get('/', (_req, res) => {
  res.json({
    message: 'Hello World'
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    message: 'De pe',
    status: 200
  });
});


app.listen(port, '0.0.0.0', () => {
  console.log(`Escutando na ${port}`);
});
