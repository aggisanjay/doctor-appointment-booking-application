import validator from 'validator'
import bcrypt from 'bcrypt'
import userModel from '../models/userModel.js'
import jwt from 'jsonwebtoken'
import{v2 as cloudinary}  from 'cloudinary'
import doctorModel from '../models/doctorModel.js'
import appointmentModel from '../models/appointmentModel.js'
import Razorpay from 'razorpay'
//api to register user

const registerUser=async(req,res)=>{
    try {
     
        const {name,email,password}=req.body

        //checking for all data 
        if(!name||!email||!password){
            return res.json({success:false,Message:'Missing Details'})
        }
        //validating email format
        if(!validator.isEmail(email)){
            return res.json({success:false,message:'Please enter a valid email'})
        }
        //validating password format
        if(password.length<8){
            return res.json({success:false,message:'Please enter a strong password'})
        }

        //hashing user password

        const salt=await bcrypt.genSalt(10)
        const hashedPassword=await bcrypt.hash(password,salt)

        const userData={
            name,
            email,
            password:hashedPassword
        }

        const newUser=new userModel(userData)
        const user=await newUser.save()

        const token=jwt.sign({id:user._id},process.env.JWT_SECRET,{expiresIn:'7d'})
        res.json({success:true,token})

       
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
        
    }
}

//api for user login

const loginUser=async(req,res)=>{
    try {
        const {email,password}=req.body
        const user=await userModel.findOne({email})
        if(!user){
            return res.json({success:false,message:'User does not exist'})
        }
        if(user){
            const isMatch=await bcrypt.compare(password,user.password)
            if(isMatch){
                const token=jwt.sign({id:user._id},process.env.JWT_SECRET,{expiresIn:'7d'})
                res.json({success:true,token})
            }else{
                res.json({success:false,message:'Invalid Credentials'})
            }
        }

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
        
    }
}

//api to get user profile data

const getProfile=async(req,res)=>{
    try {
        
        const userData=await userModel.findById(req.userId).select('-password')
        res.json({success:true,userData})

        
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }

}

//api update user profile

 const updateProfile=async(req,res) => {
    try {
        const {name,phone,address,dob,gender}=req.body
        const imageFile=req.file
        if(!name || !phone || !dob||!gender){
            return res.json({success:false,Message:'Missing Details'})
        }
        await userModel.findByIdAndUpdate(req.userId,{name,phone,address:JSON.parse(address),dob,gender})
        if(imageFile){
            //upload image to cloudinary
            const imageUpload=await cloudinary.uploader.upload(imageFile.path,{resource_type:'image'})

            const imageURL=imageUpload.secure_url
            await userModel.findByIdAndUpdate(req.userId,{image:imageURL})
            

        }
        res.json({success:true,message:'Profile Updated'})
        
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
        
    }
    
 }


 //api to book appointment

 const bookAppointment=async(req,res)=>{
    try {
        const{docId,slotDate,slotTime}=req.body
        const doctData=await doctorModel.findById(docId).select('-password')

        if(!doctData.available){
            return res.json({success:false,message:'Doctor is not available'})
        }

        let slots_booked=doctData.slots_booked
        //checking slot availability

        if(slots_booked[slotDate]){
            if(slots_booked[slotDate].includes(slotTime)){
                return res.json({success:false,message:'Slot not available'})
            }else{
                slots_booked[slotDate].push(slotTime)
            }
        }else{
            slots_booked[slotDate]=[]
            slots_booked[slotDate].push(slotTime)
        }
        const userData=await userModel.findById(req.userId).select('-password')
        
         const docDataForAppointment = {
           ...doctData.toObject(),
         };
    delete docDataForAppointment.slots_booked;


        const appointmentData={
           
            docId,
            userData,
            docData: docDataForAppointment,
            amount: doctData.fees,
            slotDate,
            slotTime,
            date:Date.now()
        }

        const newAppointment=new appointmentModel({ userId: req.userId, // Pass userId here
      ...appointmentData, })
        await newAppointment.save()

        //save new slots data in docData
        await doctorModel.findByIdAndUpdate(docId,{slots_booked})

        res.json({success:true,message:'Appointment Booked'})


    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
        
    }
 }

 //Api to get user appointments for frontend my-appointments page

 const listAppointment=async(req,res)=>{
    try {
        const appointments=await appointmentModel.find({userId:req.userId})
        res.json({success:true,appointments})
        
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
        
    }
 }

 //api to cancel appointment

  const cancelAppointment=async(req,res)=>{
    try {
        const{appointmentId}=req.body
      const appointmentData=  await appointmentModel.findById(appointmentId)
         //verify appointment user
        if(appointmentData.userId!==req.userId){
            return res.json({success:false,message:'You cannot cancel this appointment'})
        }
        await appointmentModel.findByIdAndUpdate(appointmentId,{cancelled:true})
        //releasing doctor slot
        const {docId,slotDate,slotTime}=appointmentData
        const doctorData=await doctorModel.findById(docId)
        let slots_booked=doctorData.slots_booked
        slots_booked[slotDate]=slots_booked[slotDate].filter(slot=>slot!==slotTime)
        await doctorModel.findByIdAndUpdate(docId,{slots_booked})

        res.json({success:true,message:'Appointment Cancelled'})
        
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
        
    }
 }


 //api to make payment of appointment using razorpay

 const razorpayInstance=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET})

 const paymentRazorpay=async(req,res)=>{

    try {
        const {appointmentId}=req.body
    const appointmentData=await appointmentModel.findById(appointmentId)
    
    if(!appointmentData || appointmentData.cancelled){
        return res.json({success:false,message:' Appointment Cancelled or does not exist'})
    }

    const options={
        amount:appointmentData.amount*100,
        currency:process.env.CURRENCY,
        receipt:appointmentId
    }
    //creation of an order
    const order=await razorpayInstance.orders.create(options)
    res.json({success:true,order})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
        
    }

    
 }

  //api to verify payment of razopay
  const verifyRazorpay=async(req,res)=>{
     try {
        const{razorpay_order_id}=req.body;
        
        const orderInfo=await razorpayInstance.orders.fetch(razorpay_order_id)

       if(orderInfo.status==='paid'){
            await appointmentModel.findByIdAndUpdate(orderInfo.receipt,{payment:true})
            res.json({success:true,message:'Payment Successful'})
       }else{
        res.json({success:false,message:'Payment Failed'})
       }

        
     } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
        
     }
      
  }
export {registerUser,loginUser,getProfile,updateProfile,bookAppointment,listAppointment,cancelAppointment,paymentRazorpay,verifyRazorpay}