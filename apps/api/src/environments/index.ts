import { environment as devEnv } from './environment';
import { environment as prodEnv } from './environment.prod';

const isProduction = process.env.NODE_ENV === 'production';

export const environment = isProduction ? prodEnv : devEnv;
