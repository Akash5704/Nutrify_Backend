const User = require('../models/User');
const DailyLog = require('../models/DailyLogs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
exports.userSignUp = async (req, res) => {
    try {
        const { email, password, Goal, TargetWeight, WeightSpeed, DietType, ...otherUserData } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

        const newUser = new User({
          email,
          password: hashedPassword,
          // Convert to lowercase to match schema
          goal: Goal,
          targetWeight: TargetWeight,
          weightSpeed: WeightSpeed,
          dietType: DietType,
          ...otherUserData,
        });

        await newUser.save();
        return res.status(201).json({ 
          message: "User registered successfully", 
          user: {
            ...newUser.toObject({ virtuals: true }),
            password: undefined // Don't return password in response
          }
        });
    } catch (error) {
        console.error("Error during signup:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

exports.userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT Token
    const token = jwt.sign({ id: user._id, user_id: user.user_id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    
    // Convert to object with virtuals but exclude password
    const userResponse = user.toObject({ virtuals: true });
    delete userResponse.password;
    
    res.json({ token, user: userResponse });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}