"use client";
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { Container, Form, Button, ProgressBar, Alert, InputGroup } from "react-bootstrap";
import { useRouter } from 'next/navigation';
import { Person } from "../models/models";

export default function ChangePassword() {
  const { data: session } = useSession();
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("danger");
  const [meterValue, setMeterValue] = useState(0);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  if (!session) {
    router.push("/signin");
    return null;
  }

  // Simple password strength calculation
  const calculateStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 12) strength += 25;
    if (/[A-Z]/.test(pwd)) strength += 25;
    if (/[a-z]/.test(pwd)) strength += 25;
    if (/[0-9!@#$%^&*]/.test(pwd)) strength += 25;
    return strength > 100 ? 100 : strength;
  };

  // New handler for current password field with custom masking.
  const handleOldPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const computedDisplay = showOldPassword
      ? oldPassword
      : (oldPassword.length ? "*".repeat(oldPassword.length - 1) + oldPassword.slice(-1) : "");
    const newDisplay = e.target.value;
    let newPass = oldPassword;
    if (newDisplay.length > computedDisplay.length) {
      newPass += newDisplay[newDisplay.length - 1];
    } else if (newDisplay.length < computedDisplay.length) {
      newPass = oldPassword.slice(0, newDisplay.length);
    }
    setOldPassword(newPass);
  };

  // Modified handler for new password field with custom masking and strength calc.
  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const computedDisplay = showNewPassword
      ? newPassword
      : (newPassword.length ? "*".repeat(newPassword.length - 1) + newPassword.slice(-1) : "");
    const newDisplay = e.target.value;
    let newPass = newPassword;
    if (newDisplay.length > computedDisplay.length) {
      newPass += newDisplay[newDisplay.length - 1];
    } else if (newDisplay.length < computedDisplay.length) {
      newPass = newPassword.slice(0, newDisplay.length);
    }
    setNewPassword(newPass);
    setMeterValue(calculateStrength(newPass));
  };

  // Compute displayed values
  const displayedOldPassword = showOldPassword ? oldPassword : (oldPassword.length ? "*".repeat(oldPassword.length - 1) + oldPassword.slice(-1) : "");
  const displayedNewPassword = showNewPassword ? newPassword : (newPassword.length ? "*".repeat(newPassword.length - 1) + newPassword.slice(-1) : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 12 || newPassword.length > 128) {
      setFeedbackType("danger");
      setFeedback("Password must be between 12 and 128 characters.");
      return;
    }
    setFeedback("");
    if (!oldPassword || !newPassword || !(session.user as Person).id) {
      setFeedbackType("danger");
      setFeedback("Missing required fields.");
      return;
    }
    const formData = {
      oldPassword,
      newPassword,
      userId: (session!.user! as Person).id,
    };
    try {
      const res = await fetch("/api/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setFeedbackType("success");
        setFeedback("Password updated successfully!");
      } else {
        const errorData = await res.json();
        setFeedbackType("danger");
        setFeedback(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error(error);
      setFeedbackType("danger");
      setFeedback("An unexpected error occurred.");
    }
  };

  return (
    <Container className="mt-4">
      <h2 className="mb-4">Change Password</h2>
      {feedback && <Alert variant={feedbackType}>{feedback}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Current Password</Form.Label>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Enter current password"
              value={displayedOldPassword}
              onChange={handleOldPasswordChange}
              style={{userSelect: "none"}}
              required
            />
            <Button variant="outline-secondary" onClick={() => setShowOldPassword(!showOldPassword)}>
              {showOldPassword ? "Hide" : "Show"}
            </Button>
          </InputGroup>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>New Password</Form.Label>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Enter new password"
              value={displayedNewPassword}
              onChange={handleNewPasswordChange}
              style={{userSelect: "none"}}
              required
            />
            <Button variant="outline-secondary" onClick={() => setShowNewPassword(!showNewPassword)}>
              {showNewPassword ? "Hide" : "Show"}
            </Button>
          </InputGroup>
          <Form.Text className="text-muted">
            Must be between 12 and 128 characters.
          </Form.Text>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Password Strength</Form.Label>
          <ProgressBar now={meterValue} label={`${meterValue}%`} />
        </Form.Group>
        <Button type="submit">Change Password</Button>
      </Form>
    </Container>
  );
}
