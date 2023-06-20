const catchError = require('../utils/catchError');
const User = require('../models/User');
const bcrypt = require('bcrypt')
const sendEmail = require("../utils/sendEmail");
const EmailCode = require('../models/EmailCode');
const jwt = require('jsonwebtoken')

const getAll = catchError(async(req, res) => {
    const results = await User.findAll();
    return res.json(results);
});

const create = catchError(async(req, res) => {
    const {email, password, firstName, lastName, country, image, frontBaseUrl} = req.body
    const hasPassword = await bcrypt.hash(password, 10)
    const body = {email, firstName, lastName, country, image, password:hasPassword}
    const result = await User.create(body);
    const code = require('crypto').randomBytes(64).toString('hex')
    const url = `${frontBaseUrl}/verify_email/${code}`

    await sendEmail({
        to: email,
        subject: "Verificación de cuenta",
        html: `
        <h2>Haz click en el siguiente enlace para verificar la cuenta!:</h2>
        <a href="${url}">Click me!</a>
        `
    })
    const codeBody = {code,userId:result.id}
    await EmailCode.create(codeBody)
    return res.status(201).json(result);
});

const getOne = catchError(async(req, res) => {
    const { id } = req.params;
    const result = await User.findByPk(id);
    if(!result) return res.sendStatus(404);
    return res.json(result);
});

const remove = catchError(async(req, res) => {
    const { id } = req.params;
    await User.destroy({ where: {id} });
    return res.sendStatus(204);
});

const update = catchError(async(req, res) => {
    const { id } = req.params;
    const result = await User.update(
        req.body,
        { where: {id}, returning: true }
    );
    if(result[0] === 0) return res.sendStatus(404);
    return res.json(result[1][0]);
});

const verifyUser = catchError(async(req, res) => { // /verify/:code
    const {code} = req.params
    const codeUser = await EmailCode.findOne({where: {code}})
    if(!codeUser) return res.sendStatus(401)
    
    const body = {isVerified: true}
    const user = await User.findOne({where:{id:codeUser.userId}})

    const userUpdate = await User.update(
        body,
        {where:{id:user.id}, returning:true}
    )

    await codeUser.destroy()
    return res.json(userUpdate[1][0]);

})

const login = catchError(async (req, res)=>{
     // Paso1.- Buscar Usuario
     const {email, password} = req.body
     // Paso 2.- Verificar a dicho usuario
     const user = await User.findOne({where: {email}})
     if(!user) return res.status(401).json({message: "Invalid Credencials"}) // true o false
 
     // Paso 3.- Verificar el password y comparar
     const isValuePassword = await bcrypt.compare(password, user.password) // password vuebe de la linea 54
     if(!isValuePassword) return res.status(401).json({message: "Invalid Credencials"})
    //  if(!user.isVerified) return res.sendStatus(401)

 // Paso 4.- Generar token
 const token = jwt.sign(
    {user},
    process.env.TOKEN_SECRET,
    {expiresIn: "1d"}
)
     return res.json({user, token})
})

const logged = catchError( async (req, res)=>{ // --> /users/me
    const user = req.user
    return res.json(user)

})

const resetPassword = catchError(async (req, res)=>{
    const {email, frontBaseUrl} = req.body
    const user = await User.findOne({where: {email}})
    if(!user) return res.resStatus(401)

    const code = require('crypto').randomBytes(64).toString('hex')
    const url = `${frontBaseUrl}/reset_password/${code}`

    await sendEmail({
        to: email,
        subject: "Verificación de cuenta",
        html: `
        <h2>Haz click en el siguiente enlace para verificar la cuenta!:</h2>
        <a href="${url}">Click me!</a>
        `
    })

    const body = {code, userId:user.id}
    await EmailCode.create(body)
    return res.json(user)

})

const updatePassword = catchError(async (req, res)=>{
    const {code} = req.params
    const {password} = req.body

    const userCode = await EmailCode.findOne({where: {code}})
    if(!userCode) return res.sendStatus(401)
    
    const hashPassword = await bcrypt.hash(password,10)
    const body = {paswword:hashPassword}
    const user = await User.update(body, {where:{id:userCode.userId}})
    if(user[0] === 0) return res.sendStatus(404);
    await userCode.destroy()

    return res.json(user)

})

module.exports = {
    getAll,
    create,
    getOne,
    remove,
    update,
    verifyUser,
    login,
    logged,
    resetPassword,
    updatePassword
}