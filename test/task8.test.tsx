import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import UploadPanel from '../components/UploadPanel'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePdfFile(name = 'prep-plan.pdf') {
  return new File(['%PDF-1.4 content'], name, { type: 'application/pdf' })
}

function makeDocxFile(name = 'nutrition.docx') {
  return new File(['PK content'], name, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

function dropFile(file: File) {
  const zone = screen.getByRole('button', { name: /upload file/i })
  fireEvent.drop(zone, { dataTransfer: { files: [file] } })
}

function mockFetchSuccess(filename = 'prep-plan.pdf') {
  return vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ filename }),
  })
}

function mockFetchError(message = 'Invalid file type. Only PDF and DOCX files are accepted.') {
  return vi.fn().mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: message }),
  })
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('alert', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Task 8: Frontend UI — Upload Panel', () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it('should render the drop zone with the correct role and label', () => {
    render(<UploadPanel />)
    expect(screen.getByRole('button', { name: /upload file/i })).toBeInTheDocument()
  })

  it('should render idle prompt text by default', () => {
    render(<UploadPanel />)
    expect(screen.getByText(/drop a pdf or docx here/i)).toBeInTheDocument()
  })

  // ── File type validation (client side) ─────────────────────────────────────

  it('should restrict the file input to PDF and DOCX via the accept attribute', () => {
    const { container } = render(<UploadPanel />)
    const input = container.querySelector('input[type="file"]')
    expect(input).toHaveAttribute('accept', '.pdf,.docx')
  })

  // ── Upload progress indicator ──────────────────────────────────────────────

  it('should show "Uploading…" while a request is in flight', async () => {
    // fetch never resolves so the uploading state persists
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(<UploadPanel />)

    await act(async () => {
      dropFile(makePdfFile())
    })

    expect(screen.getByText('Uploading…')).toBeInTheDocument()
  })

  it('should return to idle text after a successful upload', async () => {
    vi.stubGlobal('fetch', mockFetchSuccess())
    render(<UploadPanel />)

    await act(async () => {
      dropFile(makePdfFile())
    })

    await waitFor(() => {
      expect(screen.getByText(/drop a pdf or docx here/i)).toBeInTheDocument()
    })
  })

  // ── Files list updates ─────────────────────────────────────────────────────

  it('should add a file with ✓ status after a successful upload', async () => {
    vi.stubGlobal('fetch', mockFetchSuccess('prep-plan.pdf'))
    render(<UploadPanel />)

    await act(async () => {
      dropFile(makePdfFile('prep-plan.pdf'))
    })

    await waitFor(() => {
      expect(screen.getByText('prep-plan.pdf')).toBeInTheDocument()
      expect(screen.getByText('✓')).toBeInTheDocument()
    })
  })

  it('should add a file with ✗ status after a failed upload', async () => {
    vi.stubGlobal('fetch', mockFetchError())
    render(<UploadPanel />)

    await act(async () => {
      dropFile(makePdfFile('bad.pdf'))
    })

    await waitFor(() => {
      expect(screen.getByText('bad.pdf')).toBeInTheDocument()
      expect(screen.getByText('✗')).toBeInTheDocument()
    })
  })

  it('should display a remove button for each uploaded file', async () => {
    vi.stubGlobal('fetch', mockFetchSuccess())
    render(<UploadPanel />)

    await act(async () => {
      dropFile(makePdfFile())
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /remove prep-plan\.pdf/i })).toBeInTheDocument()
    })
  })

  it('should remove a file from the list when its remove button is clicked', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ filename: 'prep-plan.pdf' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ filename: 'prep-plan.pdf' }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<UploadPanel />)

    await act(async () => { dropFile(makePdfFile()) })
    await waitFor(() => screen.getByText('prep-plan.pdf'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /remove prep-plan\.pdf/i }))
    })

    await waitFor(() => {
      expect(screen.queryByText('prep-plan.pdf')).not.toBeInTheDocument()
    })
  })

  it('should call the DELETE endpoint when removing a successfully uploaded file', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ filename: 'prep-plan.pdf' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    render(<UploadPanel />)

    await act(async () => { dropFile(makePdfFile()) })
    await waitFor(() => screen.getByText('prep-plan.pdf'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /remove prep-plan\.pdf/i }))
    })

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find(
        ([url, opts]: [string, RequestInit]) =>
          opts?.method === 'DELETE' && url.includes('prep-plan.pdf')
      )
      expect(deleteCall).toBeDefined()
    })
  })

  it('should remove an error entry without calling the DELETE endpoint', async () => {
    const fetchMock = mockFetchError()
    vi.stubGlobal('fetch', fetchMock)
    render(<UploadPanel />)

    await act(async () => { dropFile(makePdfFile('bad.pdf')) })
    await waitFor(() => screen.getByText('bad.pdf'))

    const callCountAfterUpload = fetchMock.mock.calls.length

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /remove bad\.pdf/i }))
    })

    await waitFor(() => {
      expect(screen.queryByText('bad.pdf')).not.toBeInTheDocument()
    })

    // No additional fetch calls should have been made
    expect(fetchMock.mock.calls.length).toBe(callCountAfterUpload)
  })

  // ── Error display ──────────────────────────────────────────────────────────

  it('should display the server error message on a failed upload', async () => {
    vi.stubGlobal('fetch', mockFetchError('File too large. Maximum size is 10MB.'))
    render(<UploadPanel />)

    await act(async () => {
      dropFile(makePdfFile())
    })

    await waitFor(() => {
      expect(screen.getByText('File too large. Maximum size is 10MB.')).toBeInTheDocument()
    })
  })

  it('should display a generic error message when the fetch itself throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Network error')))
    render(<UploadPanel />)

    await act(async () => {
      dropFile(makePdfFile())
    })

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })
  })

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  it('should accept a DOCX file via drag-and-drop', async () => {
    vi.stubGlobal('fetch', mockFetchSuccess('nutrition.docx'))
    render(<UploadPanel />)

    await act(async () => {
      dropFile(makeDocxFile())
    })

    await waitFor(() => {
      expect(screen.getByText('nutrition.docx')).toBeInTheDocument()
    })
  })

  // ── Pipeline placeholder ───────────────────────────────────────────────────

  it('should fire the pipeline alert after a successful upload', async () => {
    vi.stubGlobal('fetch', mockFetchSuccess())
    const alertSpy = vi.fn()
    vi.stubGlobal('alert', alertSpy)
    render(<UploadPanel />)

    await act(async () => {
      dropFile(makePdfFile())
    })

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('pipeline ready to begin!')
    })
  })
})
