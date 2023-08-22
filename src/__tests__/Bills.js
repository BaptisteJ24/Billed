/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom"
import userEvent from "@testing-library/user-event"
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";
import router from "../app/Router.js";
import Bills from "../containers/Bills.js";

jest.mock("../app/Store", () => mockStore)

const onNavigate = (pathname) => {
  document.body.innerHTML = ROUTES({ pathname })
}

describe("Given I am connected as an employee", () => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  window.localStorage.setItem('user', JSON.stringify({
    type: 'Employee'
  }))

  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      expect(windowIcon.classList.contains('active-icon')).toBeTruthy()
    })

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen
        .getAllByTestId('bill-date')
        .filter(el => /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/.test(el.getAttribute('data-date')))
        .map(a => a.getAttribute('data-date'))

      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })

    test("Then title and newBill button should be display", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      expect(screen.getAllByText("Mes notes de frais")).toBeTruthy();
      expect(screen.getByTestId("btn-new-bill")).toBeTruthy();
    })

    describe("When I click on the New Bill button", () => {
      test("Then I should be redirected to the New Bill page", async () => {
        document.body.innerHTML = BillsUI({ data: bills })

        const billsContainer = new Bills({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const handleClickNewBill = jest.fn(() => billsContainer.handleClickNewBill())

        const newBillButton = screen.getByTestId('btn-new-bill')
        newBillButton.addEventListener('click', handleClickNewBill)
        userEvent.click(newBillButton)

        expect(handleClickNewBill).toHaveBeenCalled()
        await waitFor(() => screen.getByTestId("form-new-bill"))
        expect(screen.getByText('Envoyer une note de frais')).toBeTruthy()
      })
    })

    describe("When I click on the icon eye", () => {
      test('Then a modal should open', () => {
        document.body.innerHTML = BillsUI({ data: bills })

        const billsContainer = new Bills({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const iconEye = screen.getAllByTestId('icon-eye')[0]
        $.fn.modal = jest.fn()
        const handleClickIconEye = jest.fn(() => billsContainer.handleClickIconEye(iconEye))

        iconEye.addEventListener('click', handleClickIconEye)
        iconEye.click()

        expect(handleClickIconEye).toHaveBeenCalled()
      });

      test('Then the modal should display the attached image', () => {
        document.body.innerHTML = BillsUI({ data: bills })

        const billsContainer = new Bills({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const iconEye = screen.getAllByTestId('icon-eye')[0]
        billsContainer.handleClickIconEye(iconEye)

        expect(screen.getByTestId('modal-img')).toBeTruthy()
      });
    });
  })
});

// Integration Test GET
describe("Given I am a user connected as Employee", () => {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
  window.localStorage.setItem('user', JSON.stringify({
    type: 'Employee'
  }))
  describe("When I navigate to Bills Page", () => {
    const root = document.createElement("div")
    root.setAttribute("id", "root")
    document.body.append(root)
    router()
    window.onNavigate(ROUTES_PATH.Bills)
    test("fetches bills from mock API GET", async () => {
      document.body.innerHTML = BillsUI({ data: bills });
      await screen.findByText('Mes notes de frais')
      const myBills = await mockStore.bills().list()
      expect(screen.getAllByTestId('bill-date').length).toBe(Object.keys(myBills).length)
    })
    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills")
        Object.defineProperty(
          window,
          'localStorage',
          { value: localStorageMock }
        )
        window.localStorage.setItem('user', JSON.stringify({
          type: 'Employee'
        }))
        const root = document.createElement("div")
        root.setAttribute("id", "root")
        document.body.appendChild(root)
        router()
      })
      test("fetches bills from an API and fails with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"))
            }
          }
        })
        document.body.innerHTML = BillsUI({ error: "Erreur 404" })
        const message = await screen.findByText(/Erreur 404/)
        expect(message).toBeTruthy()
      })
      test("fetches messages from an API and fails with 500 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"))
            }
          }
        })
        document.body.innerHTML = BillsUI({ error: "Erreur 500" })
        const message = await screen.findByText(/Erreur 500/)
        expect(message).toBeTruthy()
      })
    })
  })
});
