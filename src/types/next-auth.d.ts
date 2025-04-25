import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      name: string;
      username:string;
      email: string;
      role: number;
      previous_login: Date | null;
    };
  }
}