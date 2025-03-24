/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { TransactionInput } from "@/components/customeInput";
import { Button } from "@/components/ui/button";
import { DropdownMenuDemo } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import React, { useState, useEffect, useCallback, type ChangeEvent } from "react";
import ExpenseModal, { DisabledButton, IncomeModal } from "./components/popupModal";
import { useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import Image from "next/image";
import { Icon } from "@iconify/react";

export default function Transaction() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditing = searchParams.get("edit") === "true"; // Derive isEditing from search params
  const existingTransaction = isEditing
    ? JSON.parse(localStorage.getItem("editingTransaction") || "{}")
    : null; // Derive existingTransaction from localStorage if editing

  const [transactionType, setTransactionType] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getLocalDate());
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(1);
  const [transactionTypeError, setTransactionTypeError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [dateError, setDateError] = useState("");
  const [previousType, setPreviousType] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [information, setInformation] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [imageModalOpen, setImageModalOpen] = useState<boolean>(false);
  const [formPopulatedFromImage, setFormPopulatedFromImage] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    confirmAction: () => {},
    cancelAction: () => {},
    confirmText: "Confirm",
    cancelText: "Cancel",
    confirmClass: "bg-primary",
    icon: null as React.ReactNode | null,
  });

  const handleDelete = (e?: React.FormEvent) => {
    e?.preventDefault();
    showDeleteConfirmation();
  };

  const showDeleteConfirmation = () => {
    setModalConfig({
      title: "Log Out",
      message: "Are you sure you want to log out of your account?",
      confirmAction: () => {
        setShowModal(false);
      },
      cancelAction: () => setShowModal(false),
      confirmText: "Log Out",
      cancelText: "Cancel",
      confirmClass: "bg-red active:bg-red-700 transition-colors",
      icon: <Icon icon="ph:sign-out-fill" className="text-red-600" width="32" height="32" />,
    });
    setShowModal(true);
  };

  function getLocalDate() {
    return dayjs().format("YYYY-MM-DD");
  }

  // Helper function to format date string to YYYY-MM-DD
  const formatDate = useCallback((dateString: string) => {
    return dayjs(dateString).format("YYYY-MM-DD");
  }, []);

  // Load existing transaction data if editing
  useEffect(() => {
    if (isEditing && existingTransaction) {
      const type = existingTransaction.type === "EXPENSE" ? "Expense" : "Income";
      setTransactionType(type);
      setPreviousType(type);
      setAmount((Math.abs(existingTransaction.amount) / 100).toString());
      setDate(formatDate(existingTransaction.date));
      setDescription(existingTransaction.description || "");
      setCategory(existingTransaction.categoryID);
    }
  }, [isEditing, existingTransaction, formatDate]);

  const handleTransactionTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newType = event.target.value;
    setPreviousType(transactionType);
    setTransactionType(newType);
    setTransactionTypeError("");

    if (newType === "Expense") {
      setCategory(1);
    } else if (newType === "Income") {
      setCategory(11);
    }

    if (amount) {
      const numericAmount = Math.abs(Number.parseFloat(amount));
      if (!isNaN(numericAmount)) {
        if (newType === "Expense") {
          setAmount(`-${numericAmount.toFixed(2)}`);
        } else {
          setAmount(numericAmount.toFixed(2));
        }
      }
    }
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let value = event.target.value;

    if (/^-?\d*\.?\d{0,2}$/.test(value)) {
      if (transactionType === "Expense" && !value.startsWith("-")) {
        value = `-${value}`;
      } else if (transactionType === "Income" && value.startsWith("-")) {
        value = value.replace("-", "");
      }
      setAmount(value);
      setAmountError("");
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    setDate(selectedDate);
    setDateError("");

    const today = dayjs().format("YYYY-MM-DD");
    if (selectedDate > today) {
      setDateError("Date cannot be in the future");
    }
  };

  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "ml_default");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dlbbfck9n/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      const imageUrl = data.secure_url;
      setImageUrl(imageUrl);
      return imageUrl;
    } catch (error) {
      console.error("Error uploading image to Cloudinary:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTransactionTypeError("");
    setAmountError("");
    setDateError("");
    setSuccessMessage(null);

    if (!transactionType) {
      setTransactionTypeError("Please select a transaction type.");
      return;
    }

    const trimmedAmount = amount.trim();
    if (!trimmedAmount || trimmedAmount === "-") {
      setAmountError("Please enter a valid amount.");
      return;
    }

    const positiveAmount = Math.abs(Number.parseFloat(trimmedAmount));
    if (positiveAmount <= 0) {
      setAmountError("Amount must be greater than zero.");
      return;
    }

    const today = dayjs().format("YYYY-MM-DD");
    if (date > today) {
      setDateError("Date cannot be in the future");
      return;
    }

    setIsSubmitting(true);

    try {
      let cloudinaryUrl = "";
      if (selectedImage) {
        cloudinaryUrl = await uploadImageToCloudinary(selectedImage);
      }

      const endpoint = `${process.env.NEXT_PUBLIC_API_URL}/${
        isEditing ? `transactions/${existingTransaction?.id}` : "accounts/insert"
      }`;
      const method = isEditing ? "PATCH" : "POST";
      const amountToSend = positiveAmount;
      const requestBody = {
        amount: amountToSend,
        type: transactionType.toUpperCase(),
        description,
        date,
        categoryID: category,
        imageUrl: cloudinaryUrl,
      };

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to ${isEditing ? "update" : "create"} transaction`);
      }

      setSuccessMessage(isEditing ? "Transaction updated successfully!" : "Transaction added successfully!");
      setShowSuccessModal(true);
      setTimeout(() => {
        setShowSuccessModal(false);
        router.push("/");
      }, 2000);
    } catch (err) {
      console.error("Transaction error:", err);
      alert(isEditing ? "Failed to update transaction!" : "Failed to create new transaction!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setDescription("");
      setError(null);
    }
  };

  const generateDescription = async (): Promise<void> => {
    if (!selectedImage) {
      setError("Please select an image first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);

      const response = await fetch("/api/LLM", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      const jsonString = data.description.toString().replace("```json", "").replace("```", "").trim();
      const parsedData = JSON.parse(jsonString);
      if (!response.ok) {
        throw new Error(data.error || "Failed to process image");
      }
      setInformation(jsonString);
      const type = parsedData.type.toUpperCase() === "EXPENSE" ? "Expense" : "Income";
      setTransactionType(type);
      setPreviousType(type);
      const numericAmount = Math.abs(Number.parseFloat(parsedData.amount));
      if (type === "Expense") {
        setAmount(`-${numericAmount.toFixed(2)}`);
      } else {
        setAmount(numericAmount.toFixed(2));
      }
      setDate(formatDate(parsedData.date));
      setDescription(parsedData.description || "");
      setCategory(type === "Expense" ? 10 : 14);
      setFormPopulatedFromImage(true);
      setImageModalOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const categoryType = () => {
    if (!transactionType) {
      return <DisabledButton label="Category" className="bg-gray" onClick={undefined} />;
    } else if (transactionType === "Income") {
      return <IncomeModal category={category} setCategory={setCategory} />;
    } else if (transactionType === "Expense") {
      return <ExpenseModal category={category} setCategory={setCategory} />;
    } else {
      return "error";
    }
  };

  const renderImageUploadModal = () => {
    return (
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full" onClick={() => setImageModalOpen(true)}>
            Upload Transaction Image
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Transaction Image</DialogTitle>
          </DialogHeader>
          <div className="w-full relative">
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-gray-600">Processing your image...</p>
                </div>
              </div>
            )}
            <div className="mb-6">
              <label
                htmlFor="imageUpload"
                className="block w-full p-4 text-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                Click to upload an image
              </label>
              <input
                id="imageUpload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            {previewUrl && (
              <div className="mb-6 relative w-full h-64">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  style={{ objectFit: "contain" }}
                  className="rounded-lg"
                />
              </div>
            )}
            <Button
              type="button"
              className="green-button !text-white w-full"
              onClick={generateDescription}
              disabled={loading || !selectedImage}
            >
              {loading ? "Processing..." : "Process Image record"}
            </Button>
            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const SuccessModal = () => {
    return (
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">Success!</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6">
            <div className="mb-4 text-green-600">
              <Icon icon="heroicons:check-circle" width="64" height="64" />
            </div>
            <p className="text-center text-lg">{successMessage}</p>
            <p className="text-center text-sm text-gray-500 mt-2">Redirecting to home page...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-white items-center justify-center px-4 gap-4">
      <SuccessModal />
      <div className="w-full p-0 bg-white relative z-0">
        <div className="mx-auto max-w-md px-6 py-12 bg-white border-0 rounded-2xl sm:rounded-3xl">
          <h1 className="text-2xl mt-5">{isEditing ? "Edit record" : "How much do you spend today?"}</h1>
          {formPopulatedFromImage && (
            <div className="mt-4 mb-6 p-3 bg-primary border border-blue-200 rounded-lg text-white flex items-center gap-2">
              <Icon icon="heroicons:information-circle" width="24" height="24" />
              <p className="font-medium">Please Verify your information</p>
            </div>
          )}
          <form id="form" onSubmit={handleSubmit}>
            <fieldset className="relative z-0 w-full p-px mb-5">
              <legend className="description-small text-black">Choose type of transaction</legend>
              <div className="block pt-3 pb-2 space-x-4">
                <label className="text-red">
                  <input
                    type="radio"
                    name="transactionType"
                    value="Expense"
                    checked={transactionType === "Expense"}
                    onChange={handleTransactionTypeChange}
                    className="mr-2 accent-red text-red border-3 border-red focus:border-red focus:ring-red"
                  />
                  Expense
                </label>
                <label className="text-primary">
                  <input
                    type="radio"
                    name="transactionType"
                    value="Income"
                    checked={transactionType === "Income"}
                    onChange={handleTransactionTypeChange}
                    className="mr-2 accent-primary text-primary border-3 border-primary focus:border-primary focus:ring-primary"
                  />
                  Income
                </label>
              </div>
              {transactionTypeError && <p className="text-red text-sm">{transactionTypeError}</p>}
            </fieldset>
            <div className="relative z-50 w-full mb-5 flex items-center justify-between gap-2">
              <legend className="description-small text-black">Category</legend>
              <div className="shrink-0">{categoryType()}</div>
            </div>
            <div className="relative z-0 w-full mb-5 flex items-center gap-2">
              <legend className="description-small text-black">Amount</legend>
              <div className="shrink-0">
                <DropdownMenuDemo />
              </div>
              <div className="flex flex-col w-full">
                <TransactionInput
                  type="text"
                  placeholder="0.00"
                  desc="Amount is required"
                  value={amount}
                  onChange={handleAmountChange}
                  maxLength={12}
                />
                {amountError && <p className="text-red text-sm mt-1">{amountError}</p>}
              </div>
            </div>
            <div className="relative z-0 w-full mb-5">
              <legend className="description-small text-black">Date</legend>
              <TransactionInput
                type="date"
                placeholder="Date"
                desc="Date is required"
                value={date}
                onChange={handleDateChange}
              />
              {dateError && <p className="text-red text-sm mt-1">{dateError}</p>}
            </div>
            <legend className="description-small text-black">Description</legend>
            <TransactionInput
              type="text"
              placeholder="Description"
              desc="Description is required"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={250}
            />
            <Button
              type="submit"
              className="green-button !text-white w-full mb-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  {isEditing ? "Saving..." : "Adding..."}
                </span>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Add Record"
              )}
            </Button>
            <legend className="description-small flex justify-between text-black mt-8 text-center font-bold">
              <Icon icon="lucide:image" width="24" height="24" />Upload your record without filling information
            </legend>
            <div className="mt-6">{renderImageUploadModal()}</div>
          </form>
        </div>
      </div>
    </div>
  );
}