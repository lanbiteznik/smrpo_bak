import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import EditUserForm from "../../components/EditUserForm";
import { Container } from "react-bootstrap";

interface PageProps {
  params: Promise<{ id: string }>;
}

const EditUserPage = async ({ params }: PageProps) => {
  // In Next.js 15, you need to await params
  const { id } = await params;
  
  if (isNaN(Number(id))) {
    redirect("/users");
  }

  const user = await prisma.person.findUnique({
    where: { id: Number(id) },
  });
  
  if (!user) {
    redirect("/users");
  }
  
  return (
    <Container>
      <h1 className="mb-4 mt-4">Edit User</h1>
      <EditUserForm initialData={user} />
    </Container>
  );
}

export default EditUserPage;