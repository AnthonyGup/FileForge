import mongoose from 'mongoose';
import { env } from './env';

// Con strictQuery, los filtros con campos que no existen en el schema se ignoran
mongoose.set('strictQuery', true);

export async function connectDb(): Promise<void> {
    mongoose.connection.on('error', err => console.error('Error de MongoDB:', err.message));
    mongoose.connection.on('disconnected', () => console.warn('MongoDB desconectado'));

    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB conectado: base "${mongoose.connection.name}"`);
}

export async function disconnectDb(): Promise<void> {
    await mongoose.disconnect();
}