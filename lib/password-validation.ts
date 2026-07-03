export const PASSWORD_MIN_LENGTH = 8;

export const validateStrongPassword = (password: string): string | null => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`;
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre minuscule";
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre majuscule";
  }
  if (!/(?=.*\d)/.test(password)) {
    return "Le mot de passe doit contenir au moins un chiffre";
  }
  return null;
};
