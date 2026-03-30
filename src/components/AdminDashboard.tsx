"use client";

import { formatOfferAmount, OFFER_AMOUNTS } from "@/lib/constants";
import { Item } from "@/lib/types";
import { getItemLocation, getMapUrl } from "@/lib/location";
import Image from "next/image";
import QRCode from "qrcode";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";

const PHOTO_SLOT_COUNT = 3;

function reorderArray<T>(values: T[], fromIndex: number, toIndex: number) {
  const next = [...values];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function AdminDashboard() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingMobileLink, setGeneratingMobileLink] = useState(false);
  const [mobileLink, setMobileLink] = useState<string | null>(null);
  const [mobileLinkExpiresAt, setMobileLinkExpiresAt] = useState<string | null>(null);
  const [mobileLinkQr, setMobileLinkQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>(() => Array.from({ length: PHOTO_SLOT_COUNT }, () => null));
  const [selectedFiles, setSelectedFiles] = useState<(File | null)[]>(() => Array.from({ length: PHOTO_SLOT_COUNT }, () => null));
  const photoInputRefs = useRef<Array<HTMLInputElement | null>>(Array.from({ length: PHOTO_SLOT_COUNT }, () => null));

  const loadItems = async () => {
    const response = await fetch("/api/admin/items", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to load admin inventory.");
    }
    const data = (await response.json()) as { items: Item[] };
    setItems(data.items ?? []);
  };

  useEffect(() => {
    loadItems()
      .catch((caught) => {
        const message = caught instanceof Error ? caught.message : "Unable to load inventory.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!mobileLink) {
      setMobileLinkQr(null);
      return;
    }

    let cancelled = false;

    QRCode.toDataURL(mobileLink, {
      margin: 1,
      width: 220,
    })
      .then((dataUrl: string) => {
        if (!cancelled) {
          setMobileLinkQr(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMobileLinkQr(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mobileLink]);

  useEffect(() => {
    return () => {
      for (const preview of photoPreviews) {
        if (preview) {
          URL.revokeObjectURL(preview);
        }
      }
    };
  }, [photoPreviews]);

  const setPreviewForSlot = (slotIndex: number, nextPreview: string | null) => {
    setPhotoPreviews((current) => {
      const previousPreview = current[slotIndex];
      if (previousPreview) {
        URL.revokeObjectURL(previousPreview);
      }

      const next = [...current];
      next[slotIndex] = nextPreview;
      return next;
    });
  };

  const resetPreviews = () => {
    setPhotoPreviews((current) => {
      for (const preview of current) {
        if (preview) {
          URL.revokeObjectURL(preview);
        }
      }

      return Array.from({ length: PHOTO_SLOT_COUNT }, () => null);
    });
    setSelectedFiles(Array.from({ length: PHOTO_SLOT_COUNT }, () => null));

    for (const input of photoInputRefs.current) {
      if (input) {
        input.value = "";
      }
    }
  };

  const removePhoto = (slotIndex: number) => {
    setPreviewForSlot(slotIndex, null);
    setSelectedFiles((current) => {
      const next = [...current];
      next[slotIndex] = null;
      return next;
    });

    const input = photoInputRefs.current[slotIndex];
    if (input) {
      input.value = "";
    }
  };

  const openPhotoPicker = (slotIndex: number) => {
    const input = photoInputRefs.current[slotIndex];
    if (input) {
      input.click();
    }
  };

  const captureGpsLocation = async () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      throw new Error("This device does not support GPS location capture.");
    }

    return new Promise<string>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve(`${latitude},${longitude}`);
        },
        () => {
          reject(new Error("Unable to capture GPS location. Allow location access and try again."));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    });
  };

  const onPhotoChange = async (slotIndex: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setPreviewForSlot(slotIndex, null);
      setSelectedFiles((current) => {
        const next = [...current];
        next[slotIndex] = null;
        return next;
      });
      return;
    }

    setPreviewForSlot(slotIndex, URL.createObjectURL(file));
    setSelectedFiles((current) => {
      const next = [...current];
      next[slotIndex] = file;
      return next;
    });
    setError(null);

    if (location.trim()) {
      return;
    }

    setLocationStatus("Capturing GPS location...");

    try {
      const gps = await captureGpsLocation();
      setLocation(gps);
      setLocationStatus("GPS location captured from your device.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to capture GPS location.";
      setLocationStatus(`${message} Enter the location manually if needed.`);
    }
  };

  const reorderPhotoSlot = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= PHOTO_SLOT_COUNT) {
      return;
    }

    setPhotoPreviews((current) => reorderArray(current, fromIndex, toIndex));
    setSelectedFiles((current) => reorderArray(current, fromIndex, toIndex));

    // File inputs cannot be programmatically assigned files, so clear them after reorder.
    for (const input of photoInputRefs.current) {
      if (input) {
        input.value = "";
      }
    }
  };

  const onPublish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const filesToUpload = selectedFiles.filter((entry): entry is File => entry instanceof File);
      if (!filesToUpload.length) {
        throw new Error("Select at least 1 photo before publishing.");
      }

      const form = new FormData(event.currentTarget);
      form.delete("photos");
      for (const file of filesToUpload) {
        form.append("photos", file);
      }

      const response = await fetch("/api/admin/items", {
        method: "POST",
        body: form,
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to publish item.");
      }

      event.currentTarget.reset();
      setLocation("");
      setLocationStatus(null);
      resetPreviews();
      await loadItems();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to publish item.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const generateMobileLink = async () => {
    setGeneratingMobileLink(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/mobile-link", { method: "POST" });
      const data = (await response.json()) as { url?: string; expiresAt?: string; error?: string };

      if (!response.ok || !data.url || !data.expiresAt) {
        throw new Error(data.error ?? "Unable to generate phone access link.");
      }

      const linkUrl = new URL(data.url);
      if (typeof window !== "undefined" && window.location.hostname === "localhost") {
        linkUrl.host = window.location.host;
        linkUrl.protocol = window.location.protocol;
      }

      setMobileLink(linkUrl.toString());
      setMobileLinkExpiresAt(data.expiresAt);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to generate phone access link.";
      setError(message);
    } finally {
      setGeneratingMobileLink(false);
    }
  };

  const copyMobileLink = async () => {
    if (!mobileLink || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(mobileLink);
    } catch {
      setError("Unable to copy the phone access link.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Inventory</h1>
        <button type="button" onClick={logout} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          Log Out
        </button>
      </div>

      <section className="space-y-3 rounded-lg border border-gray-300 p-4">
        <h2 className="text-lg font-semibold">Phone Camera Access</h2>
        <p className="text-sm text-gray-700">
          Generate a one-time admin link on the desktop, then open it on the iPhone to sign that browser into the admin page without entering credentials again.
        </p>
        <button
          type="button"
          onClick={generateMobileLink}
          disabled={generatingMobileLink}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {generatingMobileLink ? "Generating link..." : "Generate One-Time Phone Link"}
        </button>
        {mobileLink ? (
          <div className="space-y-2 rounded-md border border-dashed border-gray-300 p-3 text-sm">
            <p className="text-sm font-medium">Scan with iPhone Camera</p>
            {mobileLinkQr ? (
              <div className="flex justify-center rounded-md border border-gray-200 bg-white p-3">
                <Image
                  src={mobileLinkQr}
                  alt="QR code for one-time phone admin access link"
                  width={220}
                  height={220}
                  unoptimized
                />
              </div>
            ) : null}
            <p className="break-all">{mobileLink}</p>
            <p className="text-xs text-gray-600">
              Expires: {mobileLinkExpiresAt ? new Date(mobileLinkExpiresAt).toLocaleString() : "Soon"}
            </p>
            {typeof window !== "undefined" && window.location.hostname === "localhost" ? (
              <p className="text-xs text-amber-700">
                If your phone cannot open a localhost link, open the admin page on the desktop using your computer&apos;s local network URL first, then generate a new link.
              </p>
            ) : null}
            <div className="flex gap-2">
              <button type="button" onClick={copyMobileLink} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                Copy Link
              </button>
              <a href={mobileLink} target="_blank" rel="noreferrer" className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                Open Link
              </a>
            </div>
          </div>
        ) : null}
      </section>

      <form onSubmit={onPublish} className="space-y-4 rounded-lg border border-gray-300 p-4">
        <h2 className="text-lg font-semibold">Publish New Listing</h2>
        <div>
          <label className="mb-1 block text-sm font-medium">Photo Upload</label>
          <p className="mt-1 text-xs text-gray-600">Use 1 to 3 photo slots. If you want a different main photo, use Move left or Move right after selecting your images.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {photoPreviews.map((preview, index) => (
              <div
                key={`photo-slot-${index + 1}`}
                className="space-y-2 rounded-lg border border-gray-200 p-3"
              >
                <label className="block text-sm font-medium" htmlFor={`photo-slot-${index + 1}`}>
                  Photo {index + 1} {index === 0 ? "(required)" : "(optional)"}
                </label>
                <input
                  id={`photo-slot-${index + 1}`}
                  name="photos"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={(element) => {
                    photoInputRefs.current[index] = element;
                  }}
                  onChange={(event) => void onPhotoChange(index, event)}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => openPhotoPicker(index)}
                  className="w-full rounded-md border border-gray-300 px-3 py-3 text-sm font-medium"
                >
                  {preview ? `Replace Photo ${index + 1}` : `Take or Choose Photo ${index + 1}`}
                </button>
                <p className="text-xs text-gray-600">Tap the button to open the camera or photo library.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => reorderPhotoSlot(index, index - 1)}
                    disabled={index === 0}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Move left
                  </button>
                  <button
                    type="button"
                    onClick={() => reorderPhotoSlot(index, index + 1)}
                    disabled={index === PHOTO_SLOT_COUNT - 1}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Move right
                  </button>
                </div>
                {preview ? (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded-lg border border-gray-200">
                      <Image
                        src={preview}
                        alt={`Selected upload preview ${index + 1}`}
                        width={300}
                        height={240}
                        className="h-32 w-full object-cover"
                        unoptimized
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      Remove photo
                    </button>
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-500">
                    No photo selected
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Time Viewed</label>
          <input name="timeViewed" type="datetime-local" required className="w-full rounded-md border border-gray-300 p-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Pickup Location or Address</label>
          <input
            name="location"
            type="text"
            required
            placeholder="Street address, coordinates, pin share link, or map URL"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="w-full rounded-md border border-gray-300 p-2"
          />
          <p className="mt-1 text-xs text-gray-600">
            Taking a photo on your phone can auto-fill GPS. You can also type the street address or paste a map link.
          </p>
          {locationStatus ? <p className="mt-1 text-xs text-gray-700">{locationStatus}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Category</label>
          <select name="category" required className="w-full rounded-md border border-gray-300 p-2">
            <option value="Furniture">Furniture</option>
            <option value="Appliance">Appliance</option>
            <option value="Misc">Misc</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Offer Amount</label>
          <select name="offerAmount" required defaultValue={String(OFFER_AMOUNTS[0])} className="w-full rounded-md border border-gray-300 p-2">
            {OFFER_AMOUNTS.map((amount) => (
              <option key={amount} value={amount}>
                {formatOfferAmount(amount)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={submitting} className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? "Publishing..." : "Publish"}
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Inventory Status</h2>
        {loading ? <p className="text-sm text-gray-600">Loading inventory...</p> : null}
        <div className="grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-gray-200 p-3">
              <p className="text-sm font-medium">{item.category} · {item.status}</p>
              <p className="text-xs text-gray-600">Offer: {formatOfferAmount(item.offerAmount)} · Photos: {item.imageUrls.length}</p>
              <p className="text-xs text-gray-600">Time Viewed: {item.timeViewed}</p>
              <p className="text-xs text-gray-600">
                Map Location:{" "}
                <a href={getMapUrl(getItemLocation(item))} target="_blank" rel="noreferrer" className="underline">
                  Open map
                </a>
              </p>
            </article>
          ))}
          {!loading && items.length === 0 ? (
            <p className="text-sm text-gray-600">No listings yet.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
