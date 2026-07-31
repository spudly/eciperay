export type SignInViewProps = {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  loading: boolean;
  error?: string | null;
  onSubmit: () => void;
  onSignUpPress?: () => void;
  onForgotPasswordPress?: () => void;
  /** Web: react-router destination for sign-up link */
  signUpTo?: string;
  /** Web: react-router destination for forgot-password link */
  forgotPasswordTo?: string;
};

export type SignUpViewProps = {
  displayName: string;
  email: string;
  password: string;
  onDisplayNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  loading: boolean;
  error?: string | null;
  onSubmit: () => void;
  onSignInPress?: () => void;
  confirmationSent?: boolean;
  /** Web: react-router destination for sign-in link */
  signInTo?: string;
};

export type ForgotPasswordViewProps = {
  email: string;
  onEmailChange: (value: string) => void;
  loading: boolean;
  error?: string | null;
  onSubmit: () => void;
  onBackPress?: () => void;
  sent?: boolean;
  /** Web: react-router destination for sign-in link */
  signInTo?: string;
};

export type ResetPasswordViewProps = {
  password: string;
  onPasswordChange: (value: string) => void;
  loading: boolean;
  error?: string | null;
  onSubmit: () => void;
  done?: boolean;
};
