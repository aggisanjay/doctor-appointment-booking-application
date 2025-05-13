import jwt from 'jsonwebtoken'


//admin authentication middleware

const authAdmin=async(req,res,next)=>{
    try {
        const {atoken}=req.headers
        if(!atoken){
            return res.json({success:false,message:'Not Authorized Login Again'})
        }
        const decoded=jwt.verify(atoken,process.env.JWT_SECRET)

        if (
      decoded.email !== process.env.ADMIN_EMAIL ||
      decoded.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Access Denied' });
    }
        next()
        
    } catch (error) {
       console.log(error)
       res.json({success:false,message:error.message})
    }
}

export default authAdmin

