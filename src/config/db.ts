import mongoose from "mongoose";

mongoose.set("toJSON", { virtuals: true });
mongoose.set("toObject", { virtuals: true });

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI no está definida");

  await mongoose.connect(uri);
  console.log("MongoDB conectado");
};

export default connectDB;
