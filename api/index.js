import "dotenv/config";
import { attachErrorHandler, createApiApp } from "../server/app.js";

const app = createApiApp();
attachErrorHandler(app);

export default app;
