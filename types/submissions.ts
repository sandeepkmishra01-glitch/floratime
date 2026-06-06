export interface UserSubmission {
  id: string;
  lat: number;
  lng: number;
  species: string;
  commonName: string;
  notes: string;
  photoUrl: string;
  type: "flower" | "tree";
  submittedAt: string;
}
