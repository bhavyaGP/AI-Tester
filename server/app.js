//express server of CRUD operation
const express=require('express');
const app=express();
app.use(express.json());


// get post put delete -crud api
app.get('/',(req,res)=>{
  res.send('Hello World');
});
app.post('/data',(req,res)=>{
    const newData=req.body;
    res.status(201).send(newData);
});
app.put('/data/:id',(req,res)=>{
    const { id } = req.params;
    const updatedData = req.body;
    res.send(`Data with ID ${id} updated`);
});

app.delete('/data/:id',(req,res)=>{
    const { id } = req.params;
    res.send(`Data with ID ${id} deleted`);
});

app.listen(3000,()=>{
    console.log('Server is running on port 3000');
});
module.exports=app;
