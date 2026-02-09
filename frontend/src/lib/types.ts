export type Event = {
  id: string;
  title: string;
  description: string;
  location_type: "in_person" | "online" | "hybrid";
  location_name?: string | null;
  address?: string | null;
  meeting_url?: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  organizer_id: string;
  created_at: string;
  going_count: number;
  waitlist_count: number;
};

export type RSVP = {
  id: string;
  event_id: string;
  user_id: string;
  status: "going" | "waitlist" | "canceled" | "checked_in";
  created_at: string;
};

export type Review = {
  id: string;
  event_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
};
