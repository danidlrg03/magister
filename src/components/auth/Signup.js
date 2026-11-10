import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import '../../styles/auth/Form.css';

// Signup.js

const Signup = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const onSubmit = async (e) => {
        e.preventDefault();

        try {
            if (password !== password2) {
                throw new Error('Las contraseñas no coinciden');
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log(user);
            navigate('/');
        } catch (error) {
            const errorCode = error.code ? error.code : error.message
            let errorMessage = '';
            console.error(error.code);

            switch (errorCode) {
                case 'auth/invalid-email':
                    errorMessage = 'Dirección de correo electrónico inválida';
                    break;
                case 'auth/email-already-in-use':
                    errorMessage = 'La dirección de correo electrónico ya está en uso';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'La contraseña es demasiado débil';
                    break;
                case 'Las contraseñas no coinciden':
                    errorMessage = 'Las contraseñas no coinciden';
                    break;
                default:
                    errorMessage = 'Ha ocurrido un error al registrarse';
                    break;
            }

            setErrorMessage(errorMessage);
        }
    };

    return (
        <div className="auth-form-container">
            <h1 tabIndex={0}>Registrarse</h1>
            <form>
                <div className="form-group">
                    <label htmlFor="email">Dirección de correo electrónico:</label>
                    <input
                        id="email"
                        type="email"
                        label="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Dirección de correo electrónico"
                        tabIndex={0}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Contraseña:</label>
                    <input
                        id="password"
                        name="password"
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Contraseña"
                        tabIndex={0}
                    />
                    {password.length < 6 && (
                        <p className="error-message" tabIndex={0} role="alert">
                            La contraseña debe tener al menos 6 caracteres
                        </p>
                    )}
                </div>
                <div className="form-group">
                    <label htmlFor="password2">Confirmar contraseña:</label>
                    <input
                        id="password2"
                        name="password2"
                        type="password" 
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                        required
                        placeholder="Confirmar contraseña"
                        tabIndex={0}
                    />
                </div>
                <button className='authentication-button' aria-errormessage='error-registro' role='button' type="submit" onClick={onSubmit} tabIndex={0}>Registrarse</button>
                {errorMessage && <p id='error-registro' className="error-message" tabIndex={0} role="alert">{errorMessage}</p>}
            </form>
            <p className='form-p' tabIndex={0}>¿Ya tienes cuenta?</p>
            <Link to="/login">Iniciar Sesión</Link>
        </div>
    );
};

export default Signup;
