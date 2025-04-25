"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  InputGroup,
  Alert,
} from "react-bootstrap";
import { FaLock, FaEye, FaEyeSlash, FaExclamationTriangle } from "react-icons/fa";

export default function SignInForm() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [justTyped, setJustTyped] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const prevDisplay = getMaskedPassword(formData.password, justTyped);

    if (inputValue.length > prevDisplay.length) {
      const addedChar = inputValue[inputValue.length - 1];
      setFormData((prev) => ({
        ...prev,
        password: prev.password + addedChar,
      }));
      setJustTyped(true);
    } else if (inputValue.length < prevDisplay.length) {
      setFormData((prev) => ({
        ...prev,
        password: prev.password.slice(0, inputValue.length),
      }));
      setJustTyped(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn("credentials", {
      redirect: false,
      email: formData.email,
      password: formData.password,
    });
    if (res?.ok) {
      window.location.href = "/";
    } else {
      setError(res?.error || "Invalid email or password");
    }
  };

  const getMaskedPassword = (password: string, revealLast: boolean) => {
    if (showPassword) return password;
    if (password.length === 0) return "";
    if (!revealLast) return "*".repeat(password.length);
    return "*".repeat(password.length - 1) + password[password.length - 1];
  };

  const maskedPassword = getMaskedPassword(formData.password, justTyped);

  return (
    <Container fluid className="vh-100 d-flex align-items-center justify-content-center p-3">
      <Row className="justify-content-center w-100">
        <Col xs={12} sm={10} md={8} lg={6} xl={5} xxl={4}>
          <div className="bg-white p-4 p-sm-5 rounded shadow">
            <h1 className="text-center mb-4">Sign In</h1>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Password</Form.Label>
                <InputGroup className="shadow-sm rounded">
                  <InputGroup.Text className="bg-light border-end-0">
                    <FaLock className="text-secondary" />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    name="password"
                    placeholder="Enter password"
                    value={maskedPassword}
                    onChange={handlePasswordChange}
                    onCopy={(e) => e.preventDefault()}
                    style={{ 
                      userSelect: "none",
                      borderLeft: "none",
                      borderRight: "none" 
                    }}
                    className="bg-light"
                    required
                  />
                  <Button
                    variant="light"
                    className="border-start-0 border d-flex align-items-center"
                    onClick={() => {
                      setShowPassword((prev) => !prev);
                      setJustTyped(false);
                    }}
                  >
                    {showPassword ? 
                      <FaEyeSlash className="text-secondary" /> : 
                      <FaEye className="text-secondary" />
                    }
                  </Button>
                </InputGroup>
                <div className="mt-2 text-end">
                  <small className="text-muted">Forgot password?</small>
                </div>
              </Form.Group>

              {error && (
                <Alert variant="danger" className="d-flex align-items-center my-3 py-2">
                  <FaExclamationTriangle className="me-2" />
                  <span>{error}</span>
                </Alert>
              )}

              <Button 
                variant="primary" 
                type="submit" 
                className="w-100 py-2 mt-2 rounded-pill"
              >
                Sign In
              </Button>
            </Form>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
