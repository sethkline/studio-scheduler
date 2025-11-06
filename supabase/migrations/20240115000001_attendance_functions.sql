-- Helper functions for attendance system

-- Function to increment makeup credit usage when a makeup class is attended
CREATE OR REPLACE FUNCTION increment_makeup_credit_usage(booking_id UUID)
RETURNS void AS $$
DECLARE
  credit_id UUID;
BEGIN
  -- Get the credit ID from the booking
  SELECT makeup_credit_id INTO credit_id
  FROM makeup_bookings
  WHERE id = booking_id;

  -- Increment credits_used
  UPDATE makeup_credits
  SET credits_used = credits_used + 1,
      status = CASE
        WHEN credits_used + 1 >= credits_available THEN 'used'
        ELSE status
      END
  WHERE id = credit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_makeup_credit_usage(UUID) TO authenticated;
