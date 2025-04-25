import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface MyAuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  previous_login: Date | null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "Email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const user = await prisma.person.findFirst({ 
          where: { email: credentials?.email } 
        });
        if (user && (await bcrypt.compare(credentials!.password, user.password))) {
                    await prisma.person.update({
            where: { id: user.id },
            data: { previous_login: user.last_login, last_login: new Date() }
          });
          return {
id: user.id.toString(),
name: user.name,
username: user.username,
email: user.email,
role: user.role.toString(),
previous_login: user.previous_login
};
        }
        return null;
      }
    })
  ],
  pages: {
    signIn: '/signin'
  },
  callbacks: {
    async jwt({ token, user }) {
            if (user) {
        const authUser = user as MyAuthUser;
        console.log(authUser);
        token.id = authUser.id;
        token.role = Number(authUser.role);
        token.name = authUser.name;
        token.username = authUser.username;
        token.email = authUser.email;
        token.previous_login = authUser.previous_login;
      }
      return token;
    },
    async session({ session, token }) {

      session.user = {
        id: token.id as number,
        name: token.name!,
        username: token.username ? String(token.username) : "",
        email: token.email!,
        role: token.role as number,
        previous_login: token.previous_login as Date | null
      };
      return session;
    }
  }
};
